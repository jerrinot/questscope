/**
 * Component-level tests for FileHandler
 * Tests the component as a whole, minimal mocking
 */

import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { FileHandler } from '../../../src/handlers/FileHandler';
import * as FileUtils from '../../../src/utils/FileUtils';

// Only mock external I/O operations
const mockLogParser = {
  parseQuestDBLog: jest.fn()
};

const mockDataStore = {
  reset: jest.fn(),
  setQueryData: jest.fn(),
  setWalData: jest.fn(),
  setWalCommits: jest.fn(),
  setPartitionClosingData: jest.fn(),
  setPgwireConnectionData: jest.fn(),
  setErrorData: jest.fn(),
  addFileMetadata: jest.fn(),
  emit: jest.fn()
};

describe('FileHandler Component', () => {
  let fileHandler;
  
  beforeEach(() => {
    // Set up realistic DOM structure
    document.body.innerHTML = `
      <div class="container-fluid">
        <div id="uploadArea" class="upload-zone p-4 text-center border border-dashed">
          <h5>Upload QuestDB Log Files</h5>
          <p>Drop log files here or click to select</p>
        </div>
        <input type="file" id="fileInput" multiple accept=".log,.txt" style="display: none;" />
        
        <div id="progressContainer" class="mt-3" style="display: none;">
          <div class="d-flex justify-content-between">
            <span>Processing files...</span>
            <span id="progressText">0%</span>
          </div>
          <div class="progress">
            <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
          </div>
        </div>
        
        <div id="results" class="mt-3" style="display: none;">
          <h4>Analysis Results</h4>
        </div>
      </div>
    `;
    
    // Set up container insertBefore mock for error alert tests
    const container = document.querySelector('.container-fluid');
    if (container) {
      container.insertBefore = jest.fn().mockImplementation((newElement, referenceElement) => {
        container.insertBefore.originalMethod.call(container, newElement, referenceElement);
        return newElement;
      });
      container.insertBefore.originalMethod = HTMLElement.prototype.insertBefore;
    }
    
    // Inject dependencies for testing
    fileHandler = new FileHandler({
      logParser: mockLogParser,
      dataStore: mockDataStore
    });
    
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('File Upload Workflow', () => {
    it('should handle complete file upload and processing workflow', async () => {
      // Setup parser to return test data
      mockLogParser.parseQuestDBLog.mockReturnValue({
        queries: [{ timestamp: new Date(), executionTimeMs: 100, sqlPreview: 'SELECT 1' }],
        walJobs: [],
        walCommits: [],
        partitionClosings: [],
        pgwireConnections: [],
        systemEvents: []
      });
      
      fileHandler.initialize();
      
      // Create test file
      const testFile = new File(
        ['2025-01-01T12:00:00Z I i.q.g.e.QueryProgress fin [id=123, sql=`SELECT 1`, time=100000]'],
        'test.log',
        { type: 'text/plain' }
      );
      
      // Find elements using Testing Library queries
      const uploadArea = screen.getByText(/Drop log files here/i);
      const progressContainer = document.getElementById('progressContainer');
      const resultsSection = document.getElementById('results');
      
      // Initially, progress and results should be hidden
      expect(progressContainer).not.toBeVisible();
      expect(resultsSection).not.toBeVisible();
      
      // Process the file
      await fileHandler.processFiles([testFile]);
      
      // Verify data store methods were called (should be immediate since we're using mocks)
      expect(mockDataStore.reset).toHaveBeenCalled();
      expect(mockDataStore.setQueryData).toHaveBeenCalled();
      expect(mockDataStore.addFileMetadata).toHaveBeenCalled();
      expect(mockDataStore.emit).toHaveBeenCalledWith('filesProcessed', expect.any(Object));
      
      // Results should now be visible
      expect(resultsSection).toBeVisible();
      expect(progressContainer).not.toBeVisible(); // Hidden after completion
    });
    
    it('should show progress during file processing', async () => {
      mockLogParser.parseQuestDBLog.mockImplementation((content, fileName, progressCallback) => {
        // Simulate progress callbacks
        if (progressCallback) {
          setTimeout(() => progressCallback(50, 100), 10);
          setTimeout(() => progressCallback(100, 100), 20);
        }
        
        return Promise.resolve({
          queries: [],
          walJobs: [],
          walCommits: [],
          partitionClosings: [],
          pgwireConnections: [],
          systemEvents: []
        });
      });
      
      fileHandler.initialize();
      
      const testFile = new File(['test content'], 'test.log', { type: 'text/plain' });
      const progressContainer = document.getElementById('progressContainer');
      const progressText = document.getElementById('progressText');
      
      // Start processing
      const processPromise = fileHandler.processFiles([testFile]);
      
      // Progress should be shown
      await waitFor(() => {
        expect(progressContainer).toBeVisible();
      });
      
      // Wait for completion
      await processPromise;
      
      // Progress should be hidden
      expect(progressContainer).not.toBeVisible();
    });
    
    it('should handle file processing errors gracefully', async () => {
      mockLogParser.parseQuestDBLog.mockImplementation(() => {
        throw new Error('Parse failed');
      });
      
      fileHandler.initialize();
      
      const testFile = new File(['invalid content'], 'bad.log', { type: 'text/plain' });
      
      // Process file with error
      await fileHandler.processFiles([testFile]);
      
      // Wait a bit for error handling to complete
      await waitFor(() => {
        // Check error alert was created
        const errorAlert = document.getElementById('errorAlert');
        expect(errorAlert).toBeTruthy();
        expect(errorAlert.textContent).toContain('Failed to process bad.log: Parse failed');
      });
    });
  });
  
  describe('File Validation', () => {
    it('should accept valid log files', () => {
      const validFiles = [
        new File(['content'], 'test.log', { type: 'text/plain' }),
        new File(['content'], 'app.txt', { type: 'text/plain' }),
        new File(['content'], 'debug.log', { type: '' }) // no MIME type
      ];
      
      validFiles.forEach(file => {
        expect(FileUtils.isValidLogFile(file)).toBe(true);
      });
    });
    
    it('should reject invalid files', () => {
      const invalidFiles = [
        new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'document.pdf', { type: 'application/pdf' })
      ];
      
      invalidFiles.forEach(file => {
        expect(FileUtils.isValidLogFile(file)).toBe(false);
      });
    });
  });
  
  describe('Progress Tracking', () => {
    it('should calculate and display progress correctly', () => {
      fileHandler.updateProgress(75, 100, 'Processing file 3 of 4...');
      
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      
      expect(progressBar).toHaveStyle('width: 75%');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressText).toHaveTextContent('Processing file 3 of 4...');
    });
    
    it('should use default message when none provided', () => {
      fileHandler.updateProgress(60, 100);
      
      const progressText = document.getElementById('progressText');
      expect(progressText).toHaveTextContent('Processing: 60%');
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      fileHandler.initialize();
      fileHandler.updateProgress(50, 100);
      
      const progressBar = document.getElementById('progressBar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });
    
    it('should create accessible error alerts', () => {
      fileHandler.showError('Test error');
      
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert).toHaveAttribute('role', 'alert');
      expect(errorAlert).toHaveClass('alert-danger');
    });
  });
});