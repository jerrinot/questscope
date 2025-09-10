/**
 * QuestDB Log Analyzer - Main Application Entry Point
 * Refactored modular version with full feature parity
 */

// Import external libraries
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import Plotly from 'plotly.js-dist';

// Import our modules
import DataStore from './store/DataStore';
import FileHandler from './handlers/FileHandler';
import ChartManager from './visualization/ChartManager';
import { 
  groupBySecond,
  groupByInterval,
  getTopQueries,
  calculateStatistics,
  calculateTimeMetrics,
  aggregateWalMetrics,
  groupByTable
} from './processors/DataProcessor';
import { formatUTCTime } from './config/ChartConfig';

// Make Chart.js and Plotly globally available for ChartManager
window.Chart = Chart;
window.Plotly = Plotly;

/**
 * Main Application class
 */
class QuestDBAnalyzer {
  constructor() {
    this.chartManager = new ChartManager();
    this.fileHandler = FileHandler;
    
    // Listen for data changes
    this.setupDataListeners();
  }

  /**
   * Initialize the application
   */
  initialize() {
    console.log('Initializing QuestDB Log Analyzer...');
    
    // Initialize file handler
    this.fileHandler.initialize();
    
    // Initialize UI
    this.initializeUI();
    
    console.log('QuestDB Log Analyzer initialized successfully');
  }

  /**
   * Setup data store event listeners
   */
  setupDataListeners() {
    // Listen for files processed event
    DataStore.on('filesProcessed', (data) => {
      this.generateVisualizations();
    });
    
    // Listen for table filter changes
    this.setupTableFiltering();
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    // Hide results initially
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }

    // Hide progress initially
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }

  /**
   * Setup table filtering functionality
   */
  setupTableFiltering() {
    // Main table filter
    const tableFilter = document.getElementById('tableFilter');
    if (tableFilter) {
      tableFilter.addEventListener('change', (e) => {
        this.filterByTable(e.target.value);
      });
    }

    // WAL table filter
    const walTableFilter = document.getElementById('walTableFilter');
    if (walTableFilter) {
      walTableFilter.addEventListener('change', (e) => {
        this.filterWalByTable(e.target.value);
      });
    }
  }

  /**
   * Filter data by table and regenerate charts
   */
  filterByTable(tableName) {
    console.log(`Filtering by table: ${tableName}`);
    
    const filteredData = DataStore.filterByTable(tableName);
    
    // Regenerate main charts with filtered data
    if (filteredData.queries.length > 0) {
      const timeGrouped = groupBySecond(filteredData.queries);
      const topQueries = getTopQueries(filteredData.queries);
      
      this.chartManager.createTimelineChart(timeGrouped);
      this.chartManager.createFrequencyChart(timeGrouped);
      this.chartManager.createHistogramChart(filteredData.queries);
      this.chartManager.createBoxPlot(filteredData.queries);
      this.chartManager.createHeatmaps(filteredData.queries, topQueries);
      this.chartManager.createSlowestChart(topQueries);
    }

    // Regenerate error charts
    if (filteredData.errors.length > 0) {
      this.chartManager.createErrorCharts(filteredData.errors);
    }
  }

  /**
   * Filter WAL data by table
   */
  filterWalByTable(tableName) {
    console.log(`Filtering WAL by table: ${tableName}`);
    
    const walData = tableName === 'all' ? 
      DataStore.walData : 
      DataStore.walData.filter(d => d.table === tableName);
    
    if (walData.length > 0) {
      this.chartManager.createWalCharts(walData);
    }
  }

  /**
   * Generate all visualizations
   */
  async generateVisualizations() {
    console.log('Generating visualizations...');
    
    try {
      const allData = DataStore.getAllData();
      
      // Generate statistics
      const stats = this.generateStats(allData.queries);
      this.displayStats(stats);
      
      // Display file information
      this.displayFileInfo();
      
      // Setup table filters
      this.populateTableFilters();
      
      if (allData.queries.length === 0) {
        throw new Error('No query data found');
      }

      // Process data for charts
      const timeGrouped = groupBySecond(allData.queries);
      const topQueries = getTopQueries(allData.queries);
      
      // Clear existing charts
      DataStore.destroyAllCharts();
      
      // Generate main charts
      await this.chartManager.createTimelineChart(timeGrouped);
      await this.chartManager.createFrequencyChart(timeGrouped);
      await this.chartManager.createHistogramChart(allData.queries);
      await this.chartManager.createBoxPlot(allData.queries);
      await this.chartManager.createHeatmaps(allData.queries, topQueries);
      await this.chartManager.createSlowestChart(topQueries);
      
      // Generate error charts if errors exist
      if (allData.errors.length > 0) {
        await this.chartManager.createErrorCharts(allData.errors);
      }
      
      // Generate WAL charts if WAL data exists
      if (allData.walJobs.length > 0) {
        await this.chartManager.createWalCharts();
      }
      
      // Generate partition closing charts if data exists
      if (allData.partitionClosings.length > 0) {
        await this.chartManager.createPartitionClosingChart();
      }
      
      console.log('All visualizations generated successfully');
      
    } catch (error) {
      console.error('Error generating visualizations:', error);
      this.showError(`Error generating visualizations: ${error.message}`);
    }
  }

  /**
   * Generate statistics from query data
   */
  generateStats(data) {
    if (!data || data.length === 0) {
      return {
        totalQueries: 0,
        avgExecutionTime: 0,
        p95ExecutionTime: 0,
        maxExecutionTime: 0,
        timeRange: 'No data'
      };
    }

    const times = data.map(d => d.executionTimeMs);
    const stats = calculateStatistics(times);
    const timeMetrics = calculateTimeMetrics(data);
    
    return {
      totalQueries: data.length,
      avgExecutionTime: stats.mean,
      p95ExecutionTime: stats.p95,
      maxExecutionTime: stats.max,
      timeRange: timeMetrics.startTime && timeMetrics.endTime ? 
        `${formatUTCTime(timeMetrics.startTime)} to ${formatUTCTime(timeMetrics.endTime)}` : 
        'Unknown'
    };
  }

  /**
   * Display statistics cards
   */
  displayStats(stats) {
    const statsRow = document.getElementById('statsRow');
    if (!statsRow) return;

    statsRow.innerHTML = `
      <div class="col-md-3">
        <div class="stats-card">
          <h6>Total Queries</h6>
          <h3>${stats.totalQueries.toLocaleString()}</h3>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stats-card">
          <h6>Avg Execution Time</h6>
          <h3>${stats.avgExecutionTime.toFixed(2)}ms</h3>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stats-card">
          <h6>P95 Execution Time</h6>
          <h3>${stats.p95ExecutionTime.toFixed(2)}ms</h3>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stats-card">
          <h6>Max Execution Time</h6>
          <h3>${stats.maxExecutionTime.toFixed(2)}ms</h3>
        </div>
      </div>
    `;
  }

  /**
   * Display file information
   */
  displayFileInfo() {
    const fileInfoDiv = document.getElementById('fileInfo');
    const fileMetadata = DataStore.fileMetadata;
    
    if (!fileInfoDiv || fileMetadata.length === 0) return;
    
    // Calculate overall timestamp range
    let overallMin = null;
    let overallMax = null;
    let totalRecords = 0;
    
    fileMetadata.forEach(meta => {
      if (meta.startTime) {
        if (!overallMin || meta.startTime < overallMin) {
          overallMin = meta.startTime;
        }
      }
      if (meta.endTime) {
        if (!overallMax || meta.endTime > overallMax) {
          overallMax = meta.endTime;
        }
      }
      totalRecords += meta.recordCount || 0;
    });
    
    let overallRangeText = 'Unknown time range';
    if (overallMin && overallMax) {
      const durationMs = overallMax.getTime() - overallMin.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      overallRangeText = `${formatUTCTime(overallMin)} to ${formatUTCTime(overallMax)} (${durationMinutes} minutes)`;
    }
    
    let fileListHtml = fileMetadata.map(meta => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${meta.fileName}</strong>
          ${meta.startTime && meta.endTime ? 
            `<br><small class="text-muted">${formatUTCTime(meta.startTime)} to ${formatUTCTime(meta.endTime)}</small>` : 
            ''
          }
        </div>
        <span class="badge bg-primary rounded-pill">${(meta.recordCount || 0).toLocaleString()} records</span>
      </li>
    `).join('');
    
    fileInfoDiv.innerHTML = `
      <div class="alert alert-info">
        <strong>Overall Time Range:</strong> ${overallRangeText}<br>
        <strong>Total Records:</strong> ${totalRecords.toLocaleString()}
      </div>
      <ul class="list-group">
        ${fileListHtml}
      </ul>
    `;
  }

  /**
   * Populate table filter dropdowns
   */
  populateTableFilters() {
    const uniqueTables = DataStore.getUniqueTables();
    
    // Main table filter
    const tableFilter = document.getElementById('tableFilter');
    if (tableFilter) {
      tableFilter.innerHTML = '<option value="all">All Tables</option>' +
        uniqueTables.map(table => `<option value="${table}">${table}</option>`).join('');
    }

    // WAL table filter
    const walTableFilter = document.getElementById('walTableFilter');
    if (walTableFilter) {
      const walTables = [...new Set(DataStore.walData.map(d => d.table))].sort();
      walTableFilter.innerHTML = '<option value="all">All Tables</option>' +
        walTables.map(table => `<option value="${table}">${table}</option>`).join('');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error(message);
    
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
      <strong>Error:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
  }
}

// Initialize application when DOM is ready
let app;

function initApp() {
  app = new QuestDBAnalyzer();
  app.initialize();
}

// Handle different loading scenarios
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM is already loaded
  initApp();
}

// Export for testing
export default QuestDBAnalyzer;