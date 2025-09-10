/**
 * DataStore module - Centralized state management
 */

class DataStore {
  constructor() {
    this.reset();
    this.listeners = {};
  }

  reset() {
    this.parsedData = [];
    this.errorData = [];
    this.walData = [];
    this.walCommits = [];
    this.partitionClosingData = [];
    this.pgwireConnectionData = [];
    this.fileMetadata = [];
    this.charts = {};
    this.seriesVisibility = {};
  }

  /**
   * Set parsed query data
   */
  setQueryData(data) {
    this.parsedData = data;
    this.emit('queryDataChanged', data);
  }

  /**
   * Set WAL job data
   */
  setWalData(data) {
    this.walData = data;
    this.emit('walDataChanged', data);
  }

  /**
   * Set WAL commit data
   */
  setWalCommits(data) {
    this.walCommits = data;
    this.emit('walCommitsChanged', data);
  }

  /**
   * Set error/system event data
   */
  setErrorData(data) {
    this.errorData = data;
    this.emit('errorDataChanged', data);
  }

  /**
   * Set partition closing data
   */
  setPartitionClosingData(data) {
    this.partitionClosingData = data;
    this.emit('partitionClosingDataChanged', data);
  }

  /**
   * Set pgwire connection data
   */
  setPgwireConnectionData(data) {
    this.pgwireConnectionData = data;
    this.emit('pgwireConnectionDataChanged', data);
  }

  /**
   * Add file metadata
   */
  addFileMetadata(fileName, startTime, endTime, recordCount) {
    this.fileMetadata.push({
      fileName,
      startTime,
      endTime,
      recordCount
    });
    this.emit('fileMetadataChanged', this.fileMetadata);
  }

  /**
   * Store chart instance
   */
  setChart(name, chartInstance) {
    if (this.charts[name]) {
      this.charts[name].destroy();
    }
    this.charts[name] = chartInstance;
  }

  /**
   * Get chart instance
   */
  getChart(name) {
    return this.charts[name];
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  /**
   * Set series visibility
   */
  setSeriesVisibility(seriesName, isVisible) {
    this.seriesVisibility[seriesName] = isVisible;
    this.emit('seriesVisibilityChanged', this.seriesVisibility);
  }

  /**
   * Get all data
   */
  getAllData() {
    return {
      queries: this.parsedData,
      walJobs: this.walData,
      walCommits: this.walCommits,
      errors: this.errorData,
      partitionClosings: this.partitionClosingData,
      pgwireConnections: this.pgwireConnectionData,
      fileMetadata: this.fileMetadata
    };
  }

  /**
   * Get unique table names
   */
  getUniqueTables() {
    const tables = new Set();
    
    // Note: Query data doesn't have table property - only WAL and error data do
    this.walData.forEach(item => {
      if (item.table) tables.add(item.table);
    });
    
    this.errorData.forEach(item => {
      if (item.table) tables.add(item.table);
    });
    
    this.partitionClosingData.forEach(item => {
      if (item.table) tables.add(item.table);
    });
    
    return Array.from(tables).sort();
  }

  /**
   * Filter data by table
   */
  filterByTable(tableName) {
    if (tableName === 'all') {
      return this.getAllData();
    }
    
    return {
      queries: this.parsedData, // Query data doesn't have table property, so return all queries
      walJobs: this.walData.filter(d => d.table === tableName),
      walCommits: this.walCommits.filter(d => d.table === tableName),
      errors: this.errorData.filter(d => d.table === tableName),
      partitionClosings: this.partitionClosingData.filter(d => d.table === tableName),
      pgwireConnections: this.pgwireConnectionData,
      fileMetadata: this.fileMetadata
    };
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      callback(data);
    });
  }
}

// Export singleton instance
export default new DataStore();