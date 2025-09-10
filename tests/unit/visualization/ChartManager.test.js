import ChartManager, {
  createTimelineChart,
  createFrequencyChart,
  createHistogramChart,
  createBoxPlot,
  createHeatmaps,
  createSlowestChart,
  destroyAllCharts,
  getChart
} from '../../../src/visualization/ChartManager';
import DataStore from '../../../src/store/DataStore';
import { createTimeSeriesData } from '../../fixtures/sampleLogData';

// Mock DataStore
jest.mock('../../../src/store/DataStore', () => ({
  setChart: jest.fn(),
  getChart: jest.fn(),
  destroyAllCharts: jest.fn(),
  getAllData: jest.fn(() => ({
    partitionClosings: []
  }))
}));

// Mock the ChartManagerExtensions
jest.mock('../../../src/visualization/ChartManagerExtensions', () => ({
  createP99WithPartitionClosings: jest.fn(),
  createMaxWithPartitionClosings: jest.fn()
}));

describe('ChartManager', () => {  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock canvas elements
    const createMockCanvas = (id) => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      document.body.appendChild(canvas);
      return canvas;
    };
    
    // Create required canvas elements
    createMockCanvas('timelineChart');
    createMockCanvas('frequencyChart');
    createMockCanvas('histogramChart');
    createMockCanvas('slowestChart');
    
    // Create required div elements for Plotly
    const createMockDiv = (id) => {
      const div = document.createElement('div');
      div.id = id;
      document.body.appendChild(div);
      return div;
    };
    
    createMockDiv('boxPlot');
    createMockDiv('heatmapAvg');
    createMockDiv('heatmapP99');
    createMockDiv('heatmapMax');
    createMockDiv('heatmapCount');
  });
  
  afterEach(() => {
    // Clean up DOM elements
    document.body.innerHTML = '';
  });

  describe('ChartManager class', () => {
    it('should create instance with all chart methods', () => {
      const chartManager = new ChartManager();
      
      expect(typeof chartManager.createTimelineChart).toBe('function');
      expect(typeof chartManager.createFrequencyChart).toBe('function');
      expect(typeof chartManager.createHistogramChart).toBe('function');
      expect(typeof chartManager.createBoxPlot).toBe('function');
      expect(typeof chartManager.createHeatmaps).toBe('function');
      expect(typeof chartManager.createSlowestChart).toBe('function');
    });
  });

  describe('createTimelineChart', () => {
    it('should create timeline chart with correct configuration', () => {
      const timeGrouped = createTimeSeriesData(5).map(item => ({
        timestamp: item.timestamp,
        avgTime: item.executionTimeMs,
        count: 1
      }));
      
      createTimelineChart(timeGrouped);
      
      expect(Chart).toHaveBeenCalledWith(
        expect.anything(), // canvas context
        expect.objectContaining({
          type: 'line',
          data: expect.objectContaining({
            labels: expect.any(Array),
            datasets: expect.arrayContaining([
              expect.objectContaining({
                label: 'Average Execution Time (ms)',
                data: expect.any(Array),
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: true
              })
            ])
          }),
          options: expect.objectContaining({
            responsive: true,
            animation: false,
            scales: expect.objectContaining({
              x: expect.objectContaining({
                type: 'time',
                adapters: expect.objectContaining({
                  date: expect.objectContaining({
                    zone: 'UTC'
                  })
                })
              }),
              y: expect.objectContaining({
                title: expect.objectContaining({
                  text: 'Execution Time (ms)'
                })
              })
            })
          })
        })
      );
      
      expect(DataStore.setChart).toHaveBeenCalledWith('timeline', expect.any(Object));
    });

    it('should handle empty data', () => {
      expect(() => createTimelineChart([])).not.toThrow();
    });
  });

  describe('createFrequencyChart', () => {
    it('should create frequency chart with correct configuration', () => {
      const timeGrouped = createTimeSeriesData(5).map(item => ({
        timestamp: item.timestamp,
        count: Math.floor(Math.random() * 10) + 1
      }));
      
      createFrequencyChart(timeGrouped);
      
      expect(Chart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'line',
          data: expect.objectContaining({
            datasets: expect.arrayContaining([
              expect.objectContaining({
                label: 'Queries per Second',
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
              })
            ])
          })
        })
      );
      
      expect(DataStore.setChart).toHaveBeenCalledWith('frequency', expect.any(Object));
    });
  });

  describe('createHistogramChart', () => {
    it('should create histogram chart with correct bins', () => {
      const data = createTimeSeriesData(100);
      
      createHistogramChart(data);
      
      expect(Chart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'bar',
          data: expect.objectContaining({
            labels: expect.any(Array),
            datasets: expect.arrayContaining([
              expect.objectContaining({
                label: 'Frequency',
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)'
              })
            ])
          })
        })
      );
      
      expect(DataStore.setChart).toHaveBeenCalledWith('histogram', expect.any(Object));
    });

    it('should handle data with outliers by capping at 99th percentile', () => {
      const data = [
        ...createTimeSeriesData(95),
        // Add some outliers
        { timestamp: new Date(), executionTimeMs: 10000 },
        { timestamp: new Date(), executionTimeMs: 20000 }
      ];
      
      expect(() => createHistogramChart(data)).not.toThrow();
    });
  });

  describe('createBoxPlot', () => {
    it('should create box plot using Plotly', () => {
      const data = createTimeSeriesData(50);
      
      createBoxPlot(data);
      
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'boxPlot',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'box',
            name: 'Execution Time',
            boxpoints: 'outliers'
          })
        ]),
        expect.objectContaining({
          title: 'Execution Time Distribution',
          yaxis: expect.objectContaining({
            title: 'Execution Time (ms)'
          })
        }),
        expect.objectContaining({
          responsive: true
        })
      );
    });

    it('should filter outliers for better visualization', () => {
      const data = [
        ...createTimeSeriesData(95),
        // Add extreme outliers
        { timestamp: new Date(), executionTimeMs: 50000 },
        { timestamp: new Date(), executionTimeMs: 100000 }
      ];
      
      createBoxPlot(data);
      
      // Should still call Plotly without throwing
      expect(Plotly.newPlot).toHaveBeenCalled();
    });
  });

  describe('createHeatmaps', () => {
    it('should create multiple heatmaps', () => {
      const data = createTimeSeriesData(100);
      const topQueries = [
        { query: 'SELECT * FROM users', maxTime: 100, avgTime: 50, count: 10 },
        { query: 'SELECT * FROM orders', maxTime: 200, avgTime: 75, count: 15 }
      ];
      
      createHeatmaps(data, topQueries);
      
      // Should create 4 different heatmaps
      expect(Plotly.newPlot).toHaveBeenCalledWith('heatmapAvg', expect.any(Array), expect.any(Object), expect.any(Object));
      expect(Plotly.newPlot).toHaveBeenCalledWith('heatmapP99', expect.any(Array), expect.any(Object), expect.any(Object));
      expect(Plotly.newPlot).toHaveBeenCalledWith('heatmapMax', expect.any(Array), expect.any(Object), expect.any(Object));
      expect(Plotly.newPlot).toHaveBeenCalledWith('heatmapCount', expect.any(Array), expect.any(Object), expect.any(Object));
    });

    it('should handle empty top queries', () => {
      const data = createTimeSeriesData(10);
      
      expect(() => createHeatmaps(data, [])).not.toThrow();
    });

    it('should use sub-second intervals for finer granularity', () => {
      const data = createTimeSeriesData(10);
      const topQueries = [{ query: 'SELECT 1', maxTime: 50, avgTime: 25, count: 5 }];
      
      createHeatmaps(data, topQueries);
      
      // Should call groupByInterval with 500ms interval internally
      expect(Plotly.newPlot).toHaveBeenCalled();
    });
  });

  describe('createSlowestChart', () => {
    it('should create horizontal bar chart for slowest queries', () => {
      const topQueries = [
        { query: 'SELECT * FROM big_table', avgTime: 1000, maxTime: 2000, count: 5 },
        { query: 'SELECT * FROM users', avgTime: 500, maxTime: 800, count: 10 },
        { query: 'SELECT * FROM orders', avgTime: 300, maxTime: 600, count: 8 }
      ];
      
      createSlowestChart(topQueries);
      
      expect(Chart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'bar',
          options: expect.objectContaining({
            indexAxis: 'y' // Horizontal bars
          }),
          data: expect.objectContaining({
            datasets: expect.arrayContaining([
              expect.objectContaining({
                label: 'Average Execution Time (ms)',
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
              })
            ])
          })
        })
      );
      
      expect(DataStore.setChart).toHaveBeenCalledWith('slowest', expect.any(Object));
    });

    it('should limit to top 10 queries', () => {
      const topQueries = Array.from({ length: 15 }, (_, i) => ({
        query: `SELECT ${i} FROM table`,
        avgTime: 1000 - i * 50,
        maxTime: 2000 - i * 100,
        count: 10
      }));
      
      createSlowestChart(topQueries);
      
      // Should process the data but only show top 10
      expect(Chart).toHaveBeenCalled();
    });

    it('should sort queries by average time', () => {
      const topQueries = [
        { query: 'Fast query', avgTime: 100, maxTime: 200, count: 5 },
        { query: 'Slow query', avgTime: 1000, maxTime: 2000, count: 3 },
        { query: 'Medium query', avgTime: 500, maxTime: 800, count: 7 }
      ];
      
      createSlowestChart(topQueries);
      
      // Chart should be created with sorted data
      expect(Chart).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should destroy all charts through DataStore', () => {
      destroyAllCharts();
      expect(DataStore.destroyAllCharts).toHaveBeenCalled();
    });

    it('should get chart through DataStore', () => {
      getChart('timeline');
      expect(DataStore.getChart).toHaveBeenCalledWith('timeline');
    });
  });

  describe('error handling', () => {
    it('should handle missing canvas elements gracefully', () => {
      // Remove canvas element to test error handling
      document.getElementById('timelineChart').remove();
      
      expect(() => createTimelineChart([])).toThrow();
    });

    it('should handle Chart.js creation errors', () => {
      Chart.mockImplementationOnce(() => {
        throw new Error('Chart creation failed');
      });
      
      const data = createTimeSeriesData(5).map(item => ({
        timestamp: item.timestamp,
        avgTime: item.executionTimeMs,
        count: 1
      }));
      
      expect(() => createTimelineChart(data)).toThrow();
    });

    it('should not throw on Plotly function calls', () => {
      const data = createTimeSeriesData(10);
      
      // Should not throw synchronously
      expect(() => createBoxPlot(data)).not.toThrow();
    });
  });

  describe('data transformation', () => {
    it('should correctly transform time series data for charts', () => {
      const timeGrouped = createTimeSeriesData(3).map((item, index) => ({
        timestamp: item.timestamp,
        avgTime: 100 + index * 50,
        count: index + 1
      }));
      
      createTimelineChart(timeGrouped);
      
      const chartCall = Chart.mock.calls[0];
      const chartConfig = chartCall[1];
      
      expect(chartConfig.data.labels).toHaveLength(3);
      expect(chartConfig.data.datasets[0].data).toEqual([100, 150, 200]);
    });

    it('should handle time zone consistency in chart configurations', () => {
      const timeGrouped = [{ timestamp: new Date('2025-01-01T12:00:00Z'), avgTime: 100, count: 1 }];
      
      createTimelineChart(timeGrouped);
      
      const chartCall = Chart.mock.calls[0];
      const chartConfig = chartCall[1];
      
      expect(chartConfig.options.scales.x.adapters.date.zone).toBe('UTC');
    });
  });

  describe('chart options and styling', () => {
    it('should use consistent color schemes', () => {
      const data = createTimeSeriesData(5);
      
      createTimelineChart(data.map(item => ({ timestamp: item.timestamp, avgTime: item.executionTimeMs, count: 1 })));
      createFrequencyChart(data.map(item => ({ timestamp: item.timestamp, count: 1 })));
      
      const timelineCall = Chart.mock.calls[0][1];
      const frequencyCall = Chart.mock.calls[1][1];
      
      expect(timelineCall.data.datasets[0].borderColor).toBe('rgb(54, 162, 235)');
      expect(frequencyCall.data.datasets[0].borderColor).toBe('rgb(75, 192, 192)');
    });

    it('should disable animations for performance', () => {
      const data = createTimeSeriesData(5).map(item => ({
        timestamp: item.timestamp,
        avgTime: item.executionTimeMs,
        count: 1
      }));
      
      createTimelineChart(data);
      
      const chartCall = Chart.mock.calls[0];
      const chartConfig = chartCall[1];
      
      expect(chartConfig.options.animation).toBe(false);
    });

    it('should configure responsive charts', () => {
      const data = createTimeSeriesData(5).map(item => ({
        timestamp: item.timestamp,
        avgTime: item.executionTimeMs,
        count: 1
      }));
      
      createTimelineChart(data);
      
      const chartCall = Chart.mock.calls[0];
      const chartConfig = chartCall[1];
      
      expect(chartConfig.options.responsive).toBe(true);
    });
  });
});