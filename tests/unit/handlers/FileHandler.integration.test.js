/**
 * Integration-style tests for FileHandler using real DOM interactions
 * Tests behavior, not implementation details
 */

import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { FileHandler } from '../../../src/handlers/FileHandler';

// Mock only external dependencies, not DOM
jest.mock('../../../src/parsers/LogParser', () => ({
  parseQuestDBLog: jest.fn(() => ({
    queries: [{ timestamp: new Date(), executionTimeMs: 100, sqlPreview: 'SELECT 1' }],
    walJobs: [],
    walCommits: [],
    partitionClosings: [],
    pgwireConnections: [],
    systemEvents: []
  }))
}));

jest.mock('../../../src/store/DataStore', () => ({
  reset: jest.fn(),
  setQueryData: jest.fn(),
  setWalData: jest.fn(),
  setWalCommits: jest.fn(),
  setPartitionClosingData: jest.fn(),
  setPgwireConnectionData: jest.fn(),
  setErrorData: jest.fn(),
  addFileMetadata: jest.fn(),
  emit: jest.fn()
}));

describe('FileHandler Integration Tests', () => {
  let fileHandler;
  
  beforeEach(() => {
    // Create real DOM structure
    document.body.innerHTML = `
      <div class="container-fluid">
        <div id="uploadArea" class="upload-zone">
          Drop files here
        </div>
        <input type="file" id="fileInput" multiple />
        <div id="progressContainer" style="display: none;">
          <div id="progressBar" class="progress-bar" style="width: 0%"></div>
          <div id="progressText">Ready</div>
        </div>
        <div id="results" style="display: none;"></div>
      </div>
    `;
    
    fileHandler = new FileHandler();
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('User Interactions', () => {
    it('should show dragover state when user drags files over upload area', () => {
      fileHandler.initialize();
      
      const uploadArea = screen.getByText('Drop files here');
      
      // Use Testing Library's fireEvent for realistic interaction
      fireEvent.dragOver(uploadArea);
      
      // Test actual visual state using jest-dom matchers
      expect(uploadArea).toHaveClass('dragover');
    });

    it('should remove dragover state when user drags away', () => {
      fileHandler.initialize();
      
      const uploadArea = screen.getByText('Drop files here');
      
      // First add dragover state
      fireEvent.dragOver(uploadArea);
      expect(uploadArea).toHaveClass('dragover');
      
      // Then simulate dragleave
      fireEvent.dragLeave(uploadArea);
      expect(uploadArea).not.toHaveClass('dragover');
    });

    it('should trigger file input when upload area is clicked', () => {
      fileHandler.initialize();
      
      const uploadArea = screen.getByText('Drop files here');
      const fileInput = document.getElementById('fileInput');
      
      // Mock click method for verification (minimal mocking)
      fileInput.click = jest.fn();
      
      fireEvent.click(uploadArea);
      
      expect(fileInput.click).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    it('should update progress bar width and text', () => {
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      
      fileHandler.updateProgress(75, 100, 'Processing files...');
      
      // Test actual DOM state
      expect(progressBar.style.width).toBe('75%');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('75');
      expect(progressText.textContent).toBe('Processing files...');
    });

    it('should show and hide progress container', () => {
      const progressContainer = document.getElementById('progressContainer');
      
      fileHandler.showProgress();
      expect(progressContainer.style.display).toBe('block');
      
      fileHandler.hideProgress();
      expect(progressContainer.style.display).toBe('none');
    });
  });

  describe('Error Display', () => {
    it('should create and display error alert', () => {
      fileHandler.showError('Test error message');
      
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.classList.contains('alert')).toBe(true);
      expect(errorAlert.classList.contains('alert-danger')).toBe(true);
      expect(errorAlert.textContent).toContain('Test error message');
    });

    it('should update existing error alert', () => {
      // First error
      fileHandler.showError('First error');
      
      // Second error
      fileHandler.showError('Updated error');
      
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert.textContent).toContain('Updated error');
      expect(errorAlert.textContent).not.toContain('First error');
    });
  });

  describe('File Processing Workflow', () => {
    it('should handle complete file processing workflow', async () => {
      const file = new File(['test content'], 'test.log', { type: 'text/plain' });
      
      // Process file and verify UI updates
      await fileHandler.processFiles([file]);
      
      // Check that results are shown
      const resultsSection = document.getElementById('results');
      expect(resultsSection.style.display).toBe('block');
      
      // Check progress is hidden after completion
      const progressContainer = document.getElementById('progressContainer');
      expect(progressContainer.style.display).toBe('none');
    });
  });
});