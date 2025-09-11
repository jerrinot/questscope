import {
  groupBySecond,
  groupByInterval,
  getTopQueries,
  calculatePercentile,
  calculateStatistics,
  groupByTable,
  calculateTimeMetrics,
  createHistogramBins,
  filterByTimeRange,
  aggregateWalMetrics
} from '../../../src/processors/DataProcessor';

describe('DataProcessor', () => {
  describe('groupBySecond', () => {
    it('should group data by second', () => {
      const data = [
        { timestamp: '2025-01-01T12:00:00.100Z', executionTimeMs: 10 },
        { timestamp: '2025-01-01T12:00:00.500Z', executionTimeMs: 20 },
        { timestamp: '2025-01-01T12:00:01.100Z', executionTimeMs: 30 }
      ];
      
      const result = groupBySecond(data);
      
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(2);
      expect(result[0].avgTime).toBe(15);
      expect(result[0].maxTime).toBe(20);
      expect(result[1].count).toBe(1);
      expect(result[1].avgTime).toBe(30);
    });
  });

  describe('groupByInterval', () => {
    it('should group data by custom interval', () => {
      const data = [
        { timestamp: '2025-01-01T12:00:00.100Z', executionTimeMs: 10 },
        { timestamp: '2025-01-01T12:00:00.300Z', executionTimeMs: 20 },
        { timestamp: '2025-01-01T12:00:00.600Z', executionTimeMs: 30 }
      ];
      
      const result = groupByInterval(data, 500);
      
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(2);
      expect(result[0].avgTime).toBe(15);
      expect(result[1].count).toBe(1);
      expect(result[1].avgTime).toBe(30);
    });
  });

  describe('getTopQueries', () => {
    it('should return top queries by execution time', () => {
      const data = [
        { sqlPreview: 'SELECT * FROM...', fullSql: 'SELECT * FROM trades', executionTimeMs: 100 },
        { sqlPreview: 'SELECT * FROM...', fullSql: 'SELECT * FROM trades', executionTimeMs: 150 },
        { sqlPreview: 'INSERT INTO...', fullSql: 'INSERT INTO orders', executionTimeMs: 50 },
        { sqlPreview: 'UPDATE trades...', fullSql: 'UPDATE trades SET', executionTimeMs: 200 }
      ];
      
      const result = getTopQueries(data, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('UPDATE trades...');
      expect(result[0].maxTime).toBe(200);
      expect(result[1].query).toBe('SELECT * FROM...');
      expect(result[1].maxTime).toBe(150);
    });

    it('should calculate percentiles correctly', () => {
      const data = Array(100).fill(null).map((_, i) => ({
        sqlPreview: 'SELECT...',
        fullSql: 'SELECT * FROM test',
        executionTimeMs: i + 1
      }));
      
      const result = getTopQueries(data, 1);
      
      expect(result[0].p50).toBe(50);
      expect(result[0].p95).toBe(95);
      expect(result[0].p99).toBe(99);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      expect(calculatePercentile(data, 50)).toBe(5);
      expect(calculatePercentile(data, 90)).toBe(9);
      expect(calculatePercentile(data, 100)).toBe(10);
    });

    it('should handle empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    it('should handle single element array', () => {
      expect(calculatePercentile([42], 50)).toBe(42);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const stats = calculateStatistics(data);
      
      expect(stats.count).toBe(10);
      expect(stats.mean).toBe(5.5);
      expect(stats.median).toBe(5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.p25).toBe(3);
      expect(stats.p75).toBe(8);
      expect(stats.stdDev).toBeCloseTo(2.87, 1);
    });

    it('should handle empty data', () => {
      const stats = calculateStatistics([]);
      
      expect(stats.count).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
    });
  });

  describe('groupByTable', () => {
    it('should group data by table name', () => {
      const data = [
        { table: 'trades', value: 1 },
        { table: 'orders', value: 2 },
        { table: 'trades', value: 3 },
        { value: 4 }
      ];
      
      const result = groupByTable(data);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result.trades).toHaveLength(2);
      expect(result.orders).toHaveLength(1);
      expect(result.unknown).toHaveLength(1);
    });
  });

  describe('calculateTimeMetrics', () => {
    it('should calculate time-based metrics', () => {
      const data = [
        { timestamp: '2025-01-01T12:00:00Z' },
        { timestamp: '2025-01-01T12:00:10Z' },
        { timestamp: '2025-01-01T12:00:20Z' }
      ];
      
      const metrics = calculateTimeMetrics(data);
      
      expect(metrics.duration).toBe(20);
      expect(metrics.rate).toBe(0.15); // 3 items in 20 seconds
      expect(metrics.startTime).toEqual(new Date('2025-01-01T12:00:00Z'));
      expect(metrics.endTime).toEqual(new Date('2025-01-01T12:00:20Z'));
    });

    it('should handle empty data', () => {
      const metrics = calculateTimeMetrics([]);
      
      expect(metrics.startTime).toBeNull();
      expect(metrics.endTime).toBeNull();
      expect(metrics.duration).toBe(0);
      expect(metrics.rate).toBe(0);
    });
  });

  describe('createHistogramBins', () => {
    it('should create histogram bins', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const bins = createHistogramBins(data, 5);
      
      expect(bins).toHaveLength(5);
      expect(bins[0].start).toBe(1);
      expect(bins[4].end).toBe(10);
      expect(bins[0].count).toBe(2); // 1 and 2
      expect(bins[4].count).toBe(2); // 9 and 10
    });

    it('should handle empty data', () => {
      const bins = createHistogramBins([], 5);
      expect(bins).toHaveLength(0);
    });
  });

  describe('filterByTimeRange', () => {
    it('should filter data by time range', () => {
      const data = [
        { timestamp: '2025-01-01T12:00:00Z' },
        { timestamp: '2025-01-01T12:00:30Z' },
        { timestamp: '2025-01-01T12:01:00Z' }
      ];
      
      const startTime = new Date('2025-01-01T12:00:15Z');
      const endTime = new Date('2025-01-01T12:00:45Z');
      
      const filtered = filterByTimeRange(data, startTime, endTime);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].timestamp).toBe('2025-01-01T12:00:30Z');
    });
  });

  describe('aggregateWalMetrics', () => {
    it('should aggregate WAL metrics by table', () => {
      const walData = [
        { table: 'trades', rows: 100, timeMs: 10, amplification: 1.5 },
        { table: 'trades', rows: 200, timeMs: 20, amplification: 2.0 },
        { table: 'orders', rows: 50, timeMs: 5, amplification: 1.2 }
      ];
      
      const metrics = aggregateWalMetrics(walData);
      
      expect(Object.keys(metrics)).toHaveLength(2);
      expect(metrics.trades.totalRows).toBe(300);
      expect(metrics.trades.avgAmplification).toBe(1.75);
      expect(metrics.trades.jobCount).toBe(2);
      expect(metrics.orders.totalRows).toBe(50);
    });
  });
});