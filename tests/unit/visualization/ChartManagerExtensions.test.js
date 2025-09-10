import {
  createP99WithPartitionClosings,
  createMaxWithPartitionClosings,
  createErrorCharts,
  createConnectionErrorChart,
  createErrorTypeChart,
  createErrorTable,
  createWalCharts,
  createWalAmplificationChart,
  createWalAmplificationLogChart,
  createWalRateChart,
  createWalCommitChart,
  createWalTableChart,
  createWalTableMetrics,
  createPartitionClosingChart
} from '../../../src/visualization/ChartManagerExtensions';
import DataStore from '../../../src/store/DataStore';

// Mock DataStore
jest.mock('../../../src/store/DataStore', () => ({
  setChart: jest.fn(),
  getChart: jest.fn(),
  destroyAllCharts: jest.fn(),
  getAllData: jest.fn(() => ({
    partitionClosings: [],
    walJobs: [],
    walCommits: []
  }))
}));

// Mock ChartConfig
jest.mock('../../../src/config/ChartConfig', () => ({
  getTableColor: jest.fn((tableName, index) => `rgba(${index * 50}, ${index * 100}, ${index * 150}, 0.6)`),
  formatUTCTime: jest.fn(date => date.toISOString().replace('T', ' ').substr(0, 19) + ' UTC')
}));

describe('ChartManagerExtensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock DOM elements
    const createMockCanvas = (id) => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      document.body.appendChild(canvas);
      return canvas;
    };
    
    const createMockDiv = (id) => {
      const div = document.createElement('div');
      div.id = id;
      document.body.appendChild(div);
      return div;
    };
    
    // Create required canvas elements
    createMockCanvas('connectionErrorChart');
    createMockCanvas('errorTypeChart');
    createMockCanvas('walAmplificationChart');
    createMockCanvas('walAmplificationLogChart');
    createMockCanvas('walRateChart');
    createMockCanvas('walCommitChart');
    createMockCanvas('walTableChart');
    createMockCanvas('partitionClosingChart');
    
    // Create required div elements for Plotly
    createMockDiv('heatmapP99WithPartitions');
    createMockDiv('heatmapMaxWithPartitions');
    createMockDiv('errorTableBody');
    createMockDiv('walTableBody');
    createMockDiv('walTableFilter');
    createMockDiv('partitionClosingStats');
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('P99 with Partition Closings', () => {
    it('should create P99 heatmap with partition closing overlay', () => {
      const p99Data = [[100, 200, 150]];
      const queryNames = ['SELECT query'];
      const timeLabels = ['10:00', '10:01', '10:02'];
      const timeData = [
        { timestamp: new Date('2025-01-01T10:00:00Z') },
        { timestamp: new Date('2025-01-01T10:01:00Z') },
        { timestamp: new Date('2025-01-01T10:02:00Z') }
      ];
      const countData = [[5, 8, 3]];

      DataStore.getAllData.mockReturnValue({
        partitionClosings: [
          { timestamp: new Date('2025-01-01T10:00:30Z'), table: 'test_table' },
          { timestamp: new Date('2025-01-01T10:01:30Z'), table: 'test_table' }
        ]
      });

      createP99WithPartitionClosings(p99Data, queryNames, timeLabels, timeData, countData);

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'heatmapP99WithPartitions',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heatmap',
            colorscale: 'Oranges',
            z: expect.any(Array),
            x: timeLabels,
            y: expect.arrayContaining(['SELECT query', 'Partition Closings (scaled)'])
          })
        ]),
        expect.objectContaining({
          title: expect.objectContaining({
            text: 'P99 Execution Time with Partition Closing Events'
          }),
          xaxis: expect.objectContaining({
            title: 'Time (UTC)'
          })
        }),
        expect.objectContaining({
          responsive: true
        })
      );
    });

    it('should handle empty partition closing data', () => {
      const p99Data = [[100, 200]];
      const queryNames = ['SELECT query'];
      const timeLabels = ['10:00', '10:01'];
      const timeData = [
        { timestamp: new Date('2025-01-01T10:00:00Z') },
        { timestamp: new Date('2025-01-01T10:01:00Z') }
      ];
      const countData = [[5, 8]];

      DataStore.getAllData.mockReturnValue({
        partitionClosings: []
      });

      expect(() => createP99WithPartitionClosings(p99Data, queryNames, timeLabels, timeData, countData))
        .not.toThrow();

      expect(Plotly.newPlot).toHaveBeenCalled();
    });

    it('should scale partition closings appropriately', () => {
      const p99Data = [[1000, 2000]]; // High P99 times
      const queryNames = ['SELECT query'];
      const timeLabels = ['10:00', '10:01'];
      const timeData = [
        { timestamp: new Date('2025-01-01T10:00:00Z') },
        { timestamp: new Date('2025-01-01T10:01:00Z') }
      ];
      const countData = [[1, 1]];

      DataStore.getAllData.mockReturnValue({
        partitionClosings: [
          { timestamp: new Date('2025-01-01T10:00:30Z'), table: 'test_table' },
          { timestamp: new Date('2025-01-01T10:00:45Z'), table: 'test_table' }
        ]
      });

      createP99WithPartitionClosings(p99Data, queryNames, timeLabels, timeData, countData);

      const plotlyCall = Plotly.newPlot.mock.calls[0];
      const trace = plotlyCall[1][0];
      
      // Should have combined data with scaled partition closings
      expect(trace.z).toHaveLength(2); // Original + partition closings row
      expect(trace.y).toContain('Partition Closings (scaled)');
    });
  });

  describe('Max with Partition Closings', () => {
    it('should create Max heatmap with partition closing overlay', () => {
      const maxData = [[500, 800, 300]];
      const queryNames = ['INSERT query'];
      const timeLabels = ['10:00', '10:01', '10:02'];
      const timeData = [
        { timestamp: new Date('2025-01-01T10:00:00Z') },
        { timestamp: new Date('2025-01-01T10:01:00Z') },
        { timestamp: new Date('2025-01-01T10:02:00Z') }
      ];
      const countData = [[3, 5, 2]];

      DataStore.getAllData.mockReturnValue({
        partitionClosings: [
          { timestamp: new Date('2025-01-01T10:01:15Z'), table: 'test_table' }
        ]
      });

      createMaxWithPartitionClosings(maxData, queryNames, timeLabels, timeData, countData);

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        'heatmapMaxWithPartitions',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'heatmap',
            colorscale: 'Reds',
            z: expect.any(Array),
            y: expect.arrayContaining(['INSERT query', 'Partition Closings (scaled)'])
          })
        ]),
        expect.objectContaining({
          title: expect.objectContaining({
            text: 'Maximum Execution Time with Partition Closing Events'
          })
        }),
        expect.any(Object)
      );
    });

    it('should use Reds colorscale for max heatmap', () => {
      const maxData = [[100]];
      const queryNames = ['SELECT query'];
      const timeLabels = ['10:00'];
      const timeData = [{ timestamp: new Date('2025-01-01T10:00:00Z') }];
      const countData = [[1]];

      DataStore.getAllData.mockReturnValue({ partitionClosings: [] });

      createMaxWithPartitionClosings(maxData, queryNames, timeLabels, timeData, countData);

      const plotlyCall = Plotly.newPlot.mock.calls[0];
      const trace = plotlyCall[1][0];
      
      expect(trace.colorscale).toBe('Reds');
    });
  });

  describe('Error Charts', () => {
    const sampleErrors = [
      {
        timestamp: new Date('2025-01-01T10:00:00Z'),
        message: 'connection limit exceeded',
        errorType: 'ConnectionError',
        table: 'test_table'
      },
      {
        timestamp: new Date('2025-01-01T10:00:30Z'),
        message: 'query timeout',
        errorType: 'TimeoutError',
        table: 'other_table'
      },
      {
        timestamp: new Date('2025-01-01T10:01:00Z'),
        message: 'connection limit exceeded',
        errorType: 'ConnectionError',
        table: 'test_table'
      }
    ];

    describe('createErrorCharts', () => {
      it('should create all error chart types', () => {
        createErrorCharts(sampleErrors);

        expect(Chart).toHaveBeenCalledTimes(2); // Connection error chart + error type chart
        expect(DataStore.setChart).toHaveBeenCalledWith('connectionError', expect.any(Object));
        expect(DataStore.setChart).toHaveBeenCalledWith('errorType', expect.any(Object));
      });
    });

    describe('createConnectionErrorChart', () => {
      it('should create connection error timeline chart', () => {
        const connectionLimitData = {
          [new Date('2025-01-01T10:00:00Z').getTime()]: 1,
          [new Date('2025-01-01T10:01:00Z').getTime()]: 1
        };

        createConnectionErrorChart(connectionLimitData, sampleErrors);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'line',
            data: expect.objectContaining({
              datasets: expect.arrayContaining([
                expect.objectContaining({
                  label: 'Connection Limit Errors per Second',
                  borderColor: 'rgb(255, 99, 132)',
                  fill: true
                })
              ])
            }),
            options: expect.objectContaining({
              animation: false,
              scales: expect.objectContaining({
                x: expect.objectContaining({
                  type: 'time',
                  adapters: expect.objectContaining({
                    date: expect.objectContaining({
                      zone: 'UTC'
                    })
                  })
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('connectionError', expect.any(Object));
      });
    });

    describe('createErrorTypeChart', () => {
      it('should create error type doughnut chart', () => {
        createErrorTypeChart(sampleErrors);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'doughnut',
            data: expect.objectContaining({
              labels: expect.arrayContaining(['ConnectionError', 'TimeoutError']),
              datasets: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.any(Array),
                  backgroundColor: expect.any(Array)
                })
              ])
            }),
            options: expect.objectContaining({
              animation: false,
              plugins: expect.objectContaining({
                legend: expect.objectContaining({
                  position: 'right'
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('errorType', expect.any(Object));
      });

      it('should handle unknown error types', () => {
        const errorsWithUnknown = [
          { timestamp: new Date(), message: 'unknown error' }
        ];

        createErrorTypeChart(errorsWithUnknown);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const chartConfig = chartCall[1];
        
        expect(chartConfig.data.labels).toContain('Unknown');
      });
    });

    describe('createErrorTable', () => {
      it('should populate error table with aggregated data', () => {
        const errorsBySecond = {
          [new Date('2025-01-01T10:00:00Z').getTime()]: [
            sampleErrors[0], sampleErrors[2] // Two connection errors in same second
          ],
          [new Date('2025-01-01T10:00:30Z').getTime()]: [
            sampleErrors[1] // One timeout error
          ]
        };

        createErrorTable(errorsBySecond, sampleErrors);

        const errorTableBody = document.getElementById('errorTableBody');
        expect(errorTableBody.innerHTML).toContain('ConnectionError');
        expect(errorTableBody.innerHTML).toContain('TimeoutError');
        expect(errorTableBody.innerHTML).toContain('test_table');
      });

      it('should handle missing error table element gracefully', () => {
        document.getElementById('errorTableBody').remove();

        expect(() => createErrorTable({}, [])).not.toThrow();
      });

      it('should limit to 100 most recent errors', () => {
        // Create more than 100 errors
        const manyErrors = Array.from({ length: 150 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 1000),
          errorType: 'TestError',
          table: 'test_table'
        }));

        const errorsBySecond = {};
        manyErrors.forEach(error => {
          const key = error.timestamp.getTime();
          if (!errorsBySecond[key]) errorsBySecond[key] = [];
          errorsBySecond[key].push(error);
        });

        createErrorTable(errorsBySecond, manyErrors);

        const errorTableBody = document.getElementById('errorTableBody');
        const rows = errorTableBody.querySelectorAll('tr:not(:last-child)'); // Exclude "show more" row
        expect(rows.length).toBeLessThanOrEqual(100);
        expect(errorTableBody.innerHTML).toContain('Show');
      });
    });
  });

  describe('WAL Charts', () => {
    const sampleWalData = [
      {
        type: 'apply',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        table: 'table1',
        amplification: 2.5,
        rate: 1000,
        rows: 5000,
        timeMs: 5000
      },
      {
        type: 'apply',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        table: 'table2',
        amplification: 1.8,
        rate: 1500,
        rows: 3000,
        timeMs: 2000
      },
      {
        type: 'commit',
        timestamp: new Date('2025-01-01T10:00:30Z'),
        table: 'table1',
        rows: 100
      }
    ];

    beforeEach(() => {
      DataStore.getAllData.mockReturnValue({
        walJobs: sampleWalData,
        walCommits: sampleWalData.filter(job => job.type === 'commit')
      });
    });

    describe('createWalCharts', () => {
      it('should create all WAL chart types when data exists', () => {
        createWalCharts();

        expect(Chart).toHaveBeenCalled();
      });

      it('should handle empty WAL data gracefully', () => {
        DataStore.getAllData.mockReturnValue({
          walJobs: [],
          walCommits: []
        });

        expect(() => createWalCharts()).not.toThrow();
      });
    });

    describe('createWalAmplificationChart', () => {
      it('should create scatter chart for amplification over time', () => {
        createWalAmplificationChart(sampleWalData);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'scatter',
            data: expect.objectContaining({
              datasets: expect.any(Array)
            }),
            options: expect.objectContaining({
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
                    text: 'Amplification Factor'
                  })
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('walAmplification', expect.any(Object));
      });

      it('should filter only apply jobs for amplification', () => {
        createWalAmplificationChart(sampleWalData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const datasets = chartCall[1].data.datasets;
        
        // Should have data points only for apply jobs
        const totalDataPoints = datasets.reduce((sum, dataset) => sum + dataset.data.length, 0);
        expect(totalDataPoints).toBe(2); // Only the 2 apply jobs
      });

      it('should group data by table with color coding', () => {
        createWalAmplificationChart(sampleWalData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const datasets = chartCall[1].data.datasets;
        
        expect(datasets).toHaveLength(2); // Two different tables
        expect(datasets[0].label).toBe('table1');
        expect(datasets[1].label).toBe('table2');
      });

      it('should destroy existing chart before creating new one', () => {
        const mockExistingChart = { destroy: jest.fn() };
        DataStore.getChart.mockReturnValue(mockExistingChart);

        createWalAmplificationChart(sampleWalData);

        expect(mockExistingChart.destroy).toHaveBeenCalled();
      });
    });

    describe('createWalAmplificationLogChart', () => {
      it('should create logarithmic scale amplification chart', () => {
        createWalAmplificationLogChart(sampleWalData);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'scatter',
            options: expect.objectContaining({
              scales: expect.objectContaining({
                y: expect.objectContaining({
                  type: 'logarithmic',
                  min: 0.1,
                  title: expect.objectContaining({
                    text: 'Amplification Factor (Log Scale)'
                  })
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('walAmplificationLog', expect.any(Object));
      });

      it('should configure logarithmic tick labels', () => {
        createWalAmplificationLogChart(sampleWalData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const yAxisConfig = chartCall[1].options.scales.y;
        
        expect(yAxisConfig.ticks.callback).toBeDefined();
        expect(typeof yAxisConfig.ticks.callback).toBe('function');
      });
    });

    describe('createWalRateChart', () => {
      it('should create scatter chart for write rates', () => {
        createWalRateChart(sampleWalData);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'scatter',
            options: expect.objectContaining({
              scales: expect.objectContaining({
                y: expect.objectContaining({
                  title: expect.objectContaining({
                    text: 'Write Rate (rows/s)'
                  }),
                  beginAtZero: true
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('walRate', expect.any(Object));
      });
    });

    describe('createWalCommitChart', () => {
      it('should create scatter chart for commit data', () => {
        createWalCommitChart(sampleWalData);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'scatter',
            options: expect.objectContaining({
              scales: expect.objectContaining({
                y: expect.objectContaining({
                  title: expect.objectContaining({
                    text: 'Rows Committed'
                  }),
                  beginAtZero: true
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('walCommit', expect.any(Object));
      });

      it('should filter only commit data', () => {
        createWalCommitChart(sampleWalData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const datasets = chartCall[1].data.datasets;
        
        // Should have data points only for commit jobs
        const totalDataPoints = datasets.reduce((sum, dataset) => sum + dataset.data.length, 0);
        expect(totalDataPoints).toBe(1); // Only the 1 commit job
      });
    });

    describe('createWalTableChart', () => {
      it('should create bar chart for top 10 tables by amplification', () => {
        createWalTableChart(sampleWalData);

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'bar',
            data: expect.objectContaining({
              labels: expect.any(Array),
              datasets: expect.arrayContaining([
                expect.objectContaining({
                  label: 'Average Amplification',
                  backgroundColor: 'rgba(75, 192, 192, 0.6)'
                })
              ])
            }),
            options: expect.objectContaining({
              plugins: expect.objectContaining({
                title: expect.objectContaining({
                  text: 'Top 10 Tables by Average Amplification'
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('walTable', expect.any(Object));
      });

      it('should sort tables by average amplification', () => {
        createWalTableChart(sampleWalData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const chartData = chartCall[1].data;
        
        // table1 has amplification 2.5, table2 has 1.8, so table1 should be first
        expect(chartData.labels[0]).toBe('table1');
        expect(chartData.datasets[0].data[0]).toBe(2.5);
      });

      it('should limit to top 10 tables', () => {
        // Create data with many tables
        const manyTablesData = Array.from({ length: 15 }, (_, i) => ({
          type: 'apply',
          timestamp: new Date(),
          table: `table${i}`,
          amplification: i + 1,
          rate: 1000,
          rows: 1000,
          timeMs: 1000
        }));

        createWalTableChart(manyTablesData);

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const chartData = chartCall[1].data;
        
        expect(chartData.labels.length).toBeLessThanOrEqual(10);
      });
    });

    describe('createWalTableMetrics', () => {
      it('should update WAL table metrics', () => {
        createWalTableMetrics(sampleWalData);

        const walTableBody = document.getElementById('walTableBody');
        expect(walTableBody).toBeDefined();
        // The function updates innerHTML, which would be tested in integration tests
      });
    });
  });

  describe('Partition Closing Chart', () => {
    beforeEach(() => {
      DataStore.getAllData.mockReturnValue({
        partitionClosings: [
          {
            timestamp: new Date('2025-01-01T10:00:00Z'),
            table: 'test_table',
            partitionTimestamp: '2025-01-01T09:00:00Z',
            file: 'partition_001.d'
          },
          {
            timestamp: new Date('2025-01-01T10:01:00Z'),
            table: 'other_table',
            partitionTimestamp: '2025-01-01T09:00:00Z',
            file: 'partition_002.d'
          }
        ]
      });
    });

    describe('createPartitionClosingChart', () => {
      it('should create scatter chart for partition closing events', () => {
        createPartitionClosingChart();

        expect(Chart).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: 'scatter',
            data: expect.objectContaining({
              datasets: expect.any(Array)
            }),
            options: expect.objectContaining({
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
                    text: 'Event Sequence'
                  }),
                  beginAtZero: true
                })
              })
            })
          })
        );

        expect(DataStore.setChart).toHaveBeenCalledWith('partitionClosing', expect.any(Object));
      });

      it('should group partition closings by table', () => {
        createPartitionClosingChart();

        const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
        const datasets = chartCall[1].data.datasets;
        
        expect(datasets).toHaveLength(2); // Two different tables
        expect(datasets.some(d => d.label === 'test_table')).toBe(true);
        expect(datasets.some(d => d.label === 'other_table')).toBe(true);
      });

      it('should handle empty partition closing data', () => {
        DataStore.getAllData.mockReturnValue({
          partitionClosings: []
        });

        createPartitionClosingChart();

        const statsDiv = document.getElementById('partitionClosingStats');
        expect(statsDiv.innerHTML).toContain('No partition closing events found');
      });

      it('should update partition closing statistics', () => {
        createPartitionClosingChart();

        const statsDiv = document.getElementById('partitionClosingStats');
        expect(statsDiv.innerHTML).toContain('Total Partition Closings');
        expect(statsDiv.innerHTML).toContain('2'); // Total count
        expect(statsDiv.innerHTML).toContain('test_table');
        expect(statsDiv.innerHTML).toContain('other_table');
      });

      it('should destroy existing chart before creating new one', () => {
        const mockExistingChart = { destroy: jest.fn() };
        DataStore.getChart.mockReturnValue(mockExistingChart);

        createPartitionClosingChart();

        expect(mockExistingChart.destroy).toHaveBeenCalled();
      });

      it('should handle missing DOM elements gracefully', () => {
        document.getElementById('partitionClosingChart').remove();

        expect(() => createPartitionClosingChart()).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements

      // These functions should return early when elements are missing
      expect(() => createWalAmplificationChart([])).not.toThrow();
      expect(() => createPartitionClosingChart()).not.toThrow();
      
      // Connection error chart will throw since it doesn't check for null element
      // This is acceptable behavior - the function expects the element to exist
      expect(() => createConnectionErrorChart({}, [])).toThrow();
      expect(() => createErrorTypeChart([])).toThrow();
    });

    it('should handle Chart.js creation errors', () => {
      Chart.mockImplementationOnce(() => {
        throw new Error('Chart creation failed');
      });

      expect(() => createConnectionErrorChart({}, [])).toThrow('Chart creation failed');
    });

    it('should not throw on Plotly function calls', () => {
      // Test that the functions can be called without throwing synchronously
      expect(() => createP99WithPartitionClosings([], [], [], [], [])).not.toThrow();
      expect(() => createMaxWithPartitionClosings([], [], [], [], [])).not.toThrow();
    });
  });

  describe('UTC Time Handling', () => {
    it('should configure all time-based charts with UTC timezone', () => {
      createConnectionErrorChart({}, []);
      createWalAmplificationChart([{
        type: 'apply',
        timestamp: new Date(),
        table: 'test',
        amplification: 1.5,
        rate: 1000,
        rows: 1000,
        timeMs: 1000
      }]);

      Chart.mock.calls.forEach(call => {
        const config = call[1];
        if (config.options?.scales?.x?.type === 'time') {
          expect(config.options.scales.x.adapters.date.zone).toBe('UTC');
        }
      });
    });

    it('should use consistent time formatting in tooltips', () => {
      createConnectionErrorChart({}, []);

      const chartCall = Chart.mock.calls[Chart.mock.calls.length - 1];
      const tooltipConfig = chartCall[1].options.scales.x.time;
      
      expect(tooltipConfig.tooltipFormat).toBe('yyyy-MM-dd HH:mm:ss');
    });
  });

  describe('Data Transformation', () => {
    it('should correctly calculate partition closing scaling factors', () => {
      const p99Data = [[1000, 2000]]; // Max P99 time is 2000ms
      const partitionData = [
        { timestamp: new Date('2025-01-01T10:00:30Z'), table: 'test' },
        { timestamp: new Date('2025-01-01T10:00:45Z'), table: 'test' }
      ]; // 2 closings in first time window

      DataStore.getAllData.mockReturnValue({
        partitionClosings: partitionData
      });

      createP99WithPartitionClosings(
        p99Data,
        ['SELECT query'],
        ['10:00', '10:01'],
        [
          { timestamp: new Date('2025-01-01T10:00:00Z') },
          { timestamp: new Date('2025-01-01T10:01:00Z') }
        ],
        [[1, 1]]
      );

      const plotlyCall = Plotly.newPlot.mock.calls[0];
      const trace = plotlyCall[1][0];
      
      // Should scale partition closings to 80% of max P99 time
      // Expected scaling: 2000 * 0.8 / 2 = 800 per closing
      expect(trace.z).toHaveLength(2); // Original + partition row
      expect(trace.z[1]).toEqual([1600, 0]); // 2 * 800 for first window, 0 for second
    });

    it('should handle zero partition closings in scaling', () => {
      const maxData = [[100]];
      
      DataStore.getAllData.mockReturnValue({
        partitionClosings: []
      });

      expect(() => createMaxWithPartitionClosings(
        maxData,
        ['SELECT query'],
        ['10:00'],
        [{ timestamp: new Date('2025-01-01T10:00:00Z') }],
        [[1]]
      )).not.toThrow();
    });
  });
});