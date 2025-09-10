/**
 * FileHandler module - Handles file upload and processing
 */

import { parseQuestDBLog } from '../parsers/LogParser';
import DataStore from '../store/DataStore';
import { calculateTimeMetrics } from '../processors/DataProcessor';
import * as LogParser from '../parsers/LogParser';

class FileHandler {
  constructor(dependencies = {}) {
    this.progressCallback = null;
    // Dependency injection for testability
    this.document = dependencies.document || document;
    this.logParser = dependencies.logParser || LogParser;
    this.dataStore = dependencies.dataStore || DataStore;
    this.fileReader = dependencies.fileReader || FileReader;
  }

  /**
   * Initialize file upload handlers
   */
  initialize() {
    this.setupDragAndDrop();
    this.setupFileInput();
  }

  /**
   * Setup drag and drop handlers
   */
  setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      this.processFiles(files);
    });

    uploadArea.addEventListener('click', () => {
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.click();
    });
  }

  /**
   * Setup file input handler
   */
  setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.processFiles(files);
    });
  }

  /**
   * Process uploaded files
   */
  async processFiles(files) {
    // Show progress container
    this.showProgress();
    
    // Reset data store
    this.dataStore.reset();
    
    const allResults = {
      queries: [],
      walJobs: [],
      walCommits: [],
      partitionClosings: [],
      pgwireConnections: [],
      systemEvents: []
    };

    let fileIndex = 0;
    for (const file of files) {
      fileIndex++;
      this.updateProgress(0, 100, `Processing file ${fileIndex}/${files.length}: ${file.name}`);
      
      try {
        const content = await this.readFile(file);
        
        // Parse log file with progress callback
        const result = this.logParser.parseQuestDBLog(
          content, 
          file.name,
          (current, total) => {
            const percentage = (current / total) * 100;
            this.updateProgress(
              percentage, 
              100, 
              `Processing ${file.name}: ${current}/${total} lines`
            );
          }
        );
        
        // Calculate file metrics
        const allTimestamps = [
          ...result.queries.map(q => q.timestamp),
          ...result.walJobs.map(w => w.timestamp),
          ...result.systemEvents.map(e => e.timestamp)
        ].filter(t => t);
        
        if (allTimestamps.length > 0) {
          const metrics = calculateTimeMetrics(
            allTimestamps.map(t => ({ timestamp: t }))
          );
          
          this.dataStore.addFileMetadata(
            file.name,
            metrics.startTime,
            metrics.endTime,
            allTimestamps.length
          );
        }
        
        // Merge results
        allResults.queries.push(...result.queries);
        allResults.walJobs.push(...result.walJobs);
        allResults.walCommits.push(...result.walCommits);
        allResults.partitionClosings.push(...result.partitionClosings);
        allResults.pgwireConnections.push(...result.pgwireConnections);
        allResults.systemEvents.push(...result.systemEvents);
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        this.showError(`Failed to process ${file.name}: ${error.message}`);
      }
    }
    
    // Store all data
    this.dataStore.setQueryData(allResults.queries);
    this.dataStore.setWalData(allResults.walJobs);
    this.dataStore.setWalCommits(allResults.walCommits);
    this.dataStore.setPartitionClosingData(allResults.partitionClosings);
    this.dataStore.setPgwireConnectionData(allResults.pgwireConnections);
    this.dataStore.setErrorData(allResults.systemEvents);
    
    // Hide progress and show results
    this.hideProgress();
    this.showResults();
    
    // Emit completion event
    this.dataStore.emit('filesProcessed', allResults);
  }

  /**
   * Read file content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Update progress display
   */
  updateProgress(current, total, message = '') {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const percentage = (current / total) * 100;
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
      progressText.textContent = message || `Processing: ${Math.round(percentage)}%`;
    }
  }

  /**
   * Show progress container
   */
  showProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'block';
    }
  }

  /**
   * Hide progress container
   */
  hideProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }

  /**
   * Show results section
   */
  showResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Create or update error alert
    let errorAlert = document.getElementById('errorAlert');
    if (!errorAlert) {
      errorAlert = document.createElement('div');
      errorAlert.id = 'errorAlert';
      errorAlert.className = 'alert alert-danger alert-dismissible fade show';
      errorAlert.setAttribute('role', 'alert');
      
      const container = document.querySelector('.container-fluid');
      if (container) {
        container.insertBefore(errorAlert, container.firstChild);
      }
    }
    
    errorAlert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
  }

  /**
   * Set progress callback for external use
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
}

// Export class for testing and singleton for production
export { FileHandler };
export default new FileHandler();