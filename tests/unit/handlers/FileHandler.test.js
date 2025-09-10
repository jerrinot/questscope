import FileHandler from '../../../src/handlers/FileHandler';
import DataStore from '../../../src/store/DataStore';
import { createMockFile, sampleLogContent } from '../../fixtures/sampleLogData';

// Mock the LogParser
jest.mock('../../../src/parsers/LogParser', () => ({
  parseQuestDBLog: jest.fn((content, fileName, progressCallback) => {
    // Simulate progress callbacks
    if (progressCallback) {
      progressCallback(500, 1000);
      progressCallback(1000, 1000);
    }
    
    return {
      queries: [{ timestamp: new Date(), executionTimeMs: 100, sqlPreview: 'SELECT 1' }],
      walJobs: [{ timestamp: new Date(), table: 'test', amplification: 1.5 }],
      walCommits: [],
      partitionClosings: [],
      pgwireConnections: [],
      systemEvents: []
    };
  })
}));

// Mock DataStore
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

// Helper functions for mock events
const createMockDragEvent = (type, files = []) => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  dataTransfer: { files },
  target: document.createElement('div')
});

const createMockFormEvent = (type, target = null, value = '') => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: target || { value, files: [] }
});

describe('FileHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create required DOM elements with proper event listener mocking
    const createElement = (id, tag = 'div') => {
      const element = document.createElement(tag);
      element.id = id;
      
      // Mock addEventListener for testing event binding
      element.addEventListener = jest.fn();
      
      // Add specific mocks for certain elements
      if (id === 'fileInput') {
        element.click = jest.fn();
        // Don't set files property - jsdom handles this properly
      }
      
      // Initialize style object for progress updates
      element.style = {};
      
      // Mock classList for drag/drop tests - always replace with jest mock
      element.classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn()
      };
      
      // Mock getAttribute for progress tests
      element.getAttribute = jest.fn();
      element.setAttribute = jest.fn();
      
      document.body.appendChild(element);
      return element;
    };
    
    createElement('uploadArea');
    createElement('fileInput', 'input');
    createElement('progressContainer');
    createElement('progressBar');
    createElement('progressText');
    createElement('results');
    
    // Create a proper container for error alerts
    const container = document.createElement('div');
    container.className = 'container-fluid';
    // Add a child element for firstChild reference
    const childElement = document.createElement('div');
    container.appendChild(childElement);
    
    // Mock insertBefore to actually insert the element
    container.insertBefore = jest.fn().mockImplementation((newElement, referenceElement) => {
      container.insertBefore.originalMethod.call(container, newElement, referenceElement);
      return newElement;
    });
    // Store the original method
    container.insertBefore.originalMethod = HTMLElement.prototype.insertBefore;
    
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should initialize drag and drop handlers', () => {
      const uploadArea = document.getElementById('uploadArea');
      
      FileHandler.initialize();
      
      expect(uploadArea.addEventListener).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(uploadArea.addEventListener).toHaveBeenCalledWith('dragleave', expect.any(Function));
      expect(uploadArea.addEventListener).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(uploadArea.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should initialize file input handlers', () => {
      const fileInput = document.getElementById('fileInput');
      
      FileHandler.initialize();
      
      expect(fileInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle missing upload area gracefully', () => {
      // Remove the upload area element
      document.getElementById('uploadArea').remove();
      
      // Should not throw when upload area is missing
      expect(() => FileHandler.initialize()).not.toThrow();
    });
  });

  describe('drag and drop functionality', () => {
    beforeEach(() => {
      FileHandler.initialize();
    });

    it('should handle dragover events', () => {
      const uploadArea = document.getElementById('uploadArea');
      const dragHandler = uploadArea.addEventListener.mock.calls.find(
        call => call[0] === 'dragover'
      )[1];
      
      const event = { preventDefault: jest.fn() };
      
      // Ensure the classList mock is properly set up
      uploadArea.classList.add = jest.fn();
      
      dragHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(uploadArea.classList.add).toHaveBeenCalledWith('dragover');
    });

    it('should handle dragleave events', () => {
      const uploadArea = document.getElementById('uploadArea');
      const dragLeaveHandler = uploadArea.addEventListener.mock.calls.find(
        call => call[0] === 'dragleave'
      )[1];
      
      // Ensure the classList mock is properly set up
      uploadArea.classList.remove = jest.fn();
      
      dragLeaveHandler();
      
      expect(uploadArea.classList.remove).toHaveBeenCalledWith('dragover');
    });

    it('should handle file drop events', async () => {
      const uploadArea = document.getElementById('uploadArea');
      const dropHandler = uploadArea.addEventListener.mock.calls.find(
        call => call[0] === 'drop'
      )[1];
      
      uploadArea.classList.remove = jest.fn();
      
      const mockFile = createMockFile('test.log', sampleLogContent);
      const event = createMockDragEvent('drop', [mockFile]);
      
      // Mock processFiles method to avoid actual file processing
      const processFilesSpy = jest.spyOn(FileHandler, 'processFiles').mockResolvedValue();
      
      dropHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(uploadArea.classList.remove).toHaveBeenCalledWith('dragover');
      expect(processFilesSpy).toHaveBeenCalledWith([mockFile]);
      
      processFilesSpy.mockRestore();
    });

    it('should handle upload area click events', () => {
      const uploadArea = document.getElementById('uploadArea');
      const fileInput = document.getElementById('fileInput');
      const clickHandler = uploadArea.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      clickHandler();
      
      expect(fileInput.click).toHaveBeenCalled();
    });
  });

  describe('file input functionality', () => {
    beforeEach(() => {
      FileHandler.initialize();
    });

    it('should handle file input change events', () => {
      const fileInput = document.getElementById('fileInput');
      const changeHandler = fileInput.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      const mockFile = createMockFile('test.log');
      const event = createMockFormEvent('change');
      event.target.files = [mockFile];
      
      // Mock processFiles method
      const processFilesSpy = jest.spyOn(FileHandler, 'processFiles').mockResolvedValue();
      
      changeHandler(event);
      
      expect(processFilesSpy).toHaveBeenCalledWith([mockFile]);
      
      processFilesSpy.mockRestore();
    });
  });

  describe('file processing', () => {
    it('should process files and update DataStore', async () => {
      const mockFile = createMockFile('test.log', sampleLogContent);
      
      await FileHandler.processFiles([mockFile]);
      
      expect(DataStore.reset).toHaveBeenCalled();
      expect(DataStore.setQueryData).toHaveBeenCalled();
      expect(DataStore.setWalData).toHaveBeenCalled();
      expect(DataStore.setWalCommits).toHaveBeenCalled();
      expect(DataStore.setPartitionClosingData).toHaveBeenCalled();
      expect(DataStore.setPgwireConnectionData).toHaveBeenCalled();
      expect(DataStore.setErrorData).toHaveBeenCalled();
      expect(DataStore.emit).toHaveBeenCalledWith('filesProcessed', expect.any(Object));
    });

    it('should show and hide progress during processing', async () => {
      const mockFile = createMockFile('test.log');
      const progressContainer = document.getElementById('progressContainer');
      
      const processPromise = FileHandler.processFiles([mockFile]);
      
      // Progress should be shown immediately
      expect(progressContainer.style.display).toBe('block');
      
      await processPromise;
      
      // Progress should be hidden after completion
      expect(progressContainer.style.display).toBe('none');
    });

    it('should update progress bar during file processing', async () => {
      const mockFile = createMockFile('test.log');
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      
      await FileHandler.processFiles([mockFile]);
      
      // Progress bar should be updated
      expect(progressBar.style.width).toBeDefined();
      expect(progressText.textContent).toBeDefined();
    });

    it('should handle multiple files', async () => {
      const file1 = createMockFile('test1.log');
      const file2 = createMockFile('test2.log');
      
      await FileHandler.processFiles([file1, file2]);
      
      expect(DataStore.setQueryData).toHaveBeenCalled();
      expect(DataStore.addFileMetadata).toHaveBeenCalledTimes(2);
    });

    it('should handle file processing errors', async () => {
      // Mock parseQuestDBLog to throw an error
      const { parseQuestDBLog } = require('../../../src/parsers/LogParser');
      parseQuestDBLog.mockImplementationOnce(() => {
        throw new Error('Parse error');
      });
      
      const mockFile = createMockFile('bad.log');
      const showErrorSpy = jest.spyOn(FileHandler, 'showError').mockImplementation();
      
      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      await FileHandler.processFiles([mockFile]);
      
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process bad.log')
      );
      
      // Restore console.error
      console.error = originalConsoleError;
      showErrorSpy.mockRestore();
    });

    it('should show results section after successful processing', async () => {
      const mockFile = createMockFile('test.log');
      const resultsSection = document.getElementById('results');
      
      await FileHandler.processFiles([mockFile]);
      
      expect(resultsSection.style.display).toBe('block');
    });
  });

  describe('progress tracking', () => {
    it('should update progress with percentage and message', () => {
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      
      FileHandler.updateProgress(50, 100, 'Processing file...');
      
      expect(progressBar.style.width).toBe('50%');
      expect(progressBar.setAttribute).toHaveBeenCalledWith('aria-valuenow', 50);
      expect(progressText.textContent).toBe('Processing file...');
    });

    it('should use default message when none provided', () => {
      const progressText = document.getElementById('progressText');
      
      FileHandler.updateProgress(75, 100);
      
      expect(progressText.textContent).toBe('Processing: 75%');
    });

    it('should handle missing progress elements gracefully', () => {
      // Remove progress elements
      document.getElementById('progressBar').remove();
      document.getElementById('progressText').remove();
      
      expect(() => FileHandler.updateProgress(50, 100)).not.toThrow();
    });
  });

  describe('file reading', () => {
    it('should read file content using FileReader', async () => {
      const mockFile = createMockFile('test.log', 'file content');
      
      const content = await FileHandler.readFile(mockFile);
      
      expect(content).toBe('file content');
    });

    it('should handle file reading errors', async () => {
      const mockFile = createMockFile('test.log');
      
      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = jest.fn().mockImplementation(() => ({
        readAsText: jest.fn(function() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Read error'));
          }, 0);
        }),
        onerror: null
      }));
      
      await expect(FileHandler.readFile(mockFile)).rejects.toThrow();
      
      global.FileReader = originalFileReader;
    });
  });

  describe('error handling', () => {
    it('should show error alert when no existing alert exists', () => {
      FileHandler.showError('Test error message');
      
      // Check that an error alert was created in the DOM
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.className).toBe('alert alert-danger alert-dismissible fade show');
      expect(errorAlert.getAttribute('role')).toBe('alert');
      expect(errorAlert.innerHTML).toContain('Test error message');
      expect(errorAlert.innerHTML).toContain('btn-close');
      expect(errorAlert.innerHTML).toContain('data-bs-dismiss="alert"');
      
      // Check it was inserted into the container
      const container = document.querySelector('.container-fluid');
      expect(container.contains(errorAlert)).toBe(true);
    });

    it('should update existing error alert', () => {
      // First create an alert
      FileHandler.showError('First error message');
      
      // Then update it
      FileHandler.showError('Updated error message');
      
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert.innerHTML).toContain('Updated error message');
      expect(errorAlert.innerHTML).not.toContain('First error message');
      
      // Should still have the close button
      expect(errorAlert.innerHTML).toContain('btn-close');
    });

    it('should handle missing container gracefully', () => {
      // Remove the container to test graceful handling
      document.querySelector('.container-fluid').remove();
      
      // Should not throw even when container is missing
      expect(() => FileHandler.showError('Test error')).not.toThrow();
      
      // The alert element is created but not inserted into DOM when no container exists
      // This is the current behavior - the element exists but is not in the DOM tree
      const errorAlert = document.getElementById('errorAlert');
      expect(errorAlert).toBeNull(); // Not in DOM since no container to insert into
    });
  });

  describe('progress callback', () => {
    it('should set and use custom progress callback', () => {
      const customCallback = jest.fn();
      FileHandler.setProgressCallback(customCallback);
      
      expect(FileHandler.progressCallback).toBe(customCallback);
    });
  });
});