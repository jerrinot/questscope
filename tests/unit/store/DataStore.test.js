import DataStore from '../../../src/store/DataStore';

// Mock chart objects for testing
const mockChart = {
  destroy: jest.fn()
};

describe('DataStore', () => {
  beforeEach(() => {
    // Reset the DataStore instance before each test
    DataStore.reset();
    jest.clearAllMocks();
  });

  describe('reset', () => {
    it('should reset all data to initial state', () => {
      // Set some data first
      DataStore.setQueryData([{ id: 1 }]);
      DataStore.setWalData([{ id: 2 }]);
      DataStore.addFileMetadata('test.log', new Date(), new Date(), 100);
      
      // Reset
      DataStore.reset();
      
      // Verify all data is reset
      expect(DataStore.parsedData).toEqual([]);
      expect(DataStore.errorData).toEqual([]);
      expect(DataStore.walData).toEqual([]);
      expect(DataStore.walCommits).toEqual([]);
      expect(DataStore.partitionClosingData).toEqual([]);
      expect(DataStore.pgwireConnectionData).toEqual([]);
      expect(DataStore.fileMetadata).toEqual([]);
      expect(DataStore.charts).toEqual({});
      expect(DataStore.seriesVisibility).toEqual({});
    });
  });

  describe('data setters and getters', () => {
    it('should set and get query data', () => {
      const queryData = [
        { timestamp: new Date(), executionTimeMs: 100, sqlPreview: 'SELECT 1' }
      ];
      
      DataStore.setQueryData(queryData);
      
      expect(DataStore.parsedData).toEqual(queryData);
    });

    it('should set and get WAL data', () => {
      const walData = [
        { timestamp: new Date(), table: 'test_table', amplification: 1.5 }
      ];
      
      DataStore.setWalData(walData);
      
      expect(DataStore.walData).toEqual(walData);
    });

    it('should set and get error data', () => {
      const errorData = [
        { timestamp: new Date(), errorType: 'Connection Limit', message: 'Error' }
      ];
      
      DataStore.setErrorData(errorData);
      
      expect(DataStore.errorData).toEqual(errorData);
    });

    it('should set and get partition closing data', () => {
      const partitionData = [
        { timestamp: new Date(), table: 'test_table', partitionTimestamp: '2025-01-01' }
      ];
      
      DataStore.setPartitionClosingData(partitionData);
      
      expect(DataStore.partitionClosingData).toEqual(partitionData);
    });

    it('should set and get pgwire connection data', () => {
      const pgwireData = [
        { timestamp: new Date(), ip: '127.0.0.1', fd: 5, connCount: 10 }
      ];
      
      DataStore.setPgwireConnectionData(pgwireData);
      
      expect(DataStore.pgwireConnectionData).toEqual(pgwireData);
    });
  });

  describe('file metadata', () => {
    it('should add file metadata', () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T10:05:00Z');
      
      DataStore.addFileMetadata('test.log', startTime, endTime, 1000);
      
      expect(DataStore.fileMetadata).toHaveLength(1);
      expect(DataStore.fileMetadata[0]).toEqual({
        fileName: 'test.log',
        startTime,
        endTime,
        recordCount: 1000
      });
    });

    it('should add multiple file metadata entries', () => {
      DataStore.addFileMetadata('file1.log', new Date(), new Date(), 100);
      DataStore.addFileMetadata('file2.log', new Date(), new Date(), 200);
      
      expect(DataStore.fileMetadata).toHaveLength(2);
      expect(DataStore.fileMetadata[0].fileName).toBe('file1.log');
      expect(DataStore.fileMetadata[1].fileName).toBe('file2.log');
    });
  });

  describe('chart management', () => {
    it('should set and get chart instances', () => {
      DataStore.setChart('timeline', mockChart);
      
      expect(DataStore.getChart('timeline')).toBe(mockChart);
    });

    it('should destroy existing chart when setting new one', () => {
      const oldChart = { destroy: jest.fn() };
      const newChart = { destroy: jest.fn() };
      
      DataStore.setChart('timeline', oldChart);
      DataStore.setChart('timeline', newChart);
      
      expect(oldChart.destroy).toHaveBeenCalled();
      expect(DataStore.getChart('timeline')).toBe(newChart);
    });

    it('should destroy all charts', () => {
      const chart1 = { destroy: jest.fn() };
      const chart2 = { destroy: jest.fn() };
      
      DataStore.setChart('timeline', chart1);
      DataStore.setChart('frequency', chart2);
      
      DataStore.destroyAllCharts();
      
      expect(chart1.destroy).toHaveBeenCalled();
      expect(chart2.destroy).toHaveBeenCalled();
      expect(DataStore.charts).toEqual({});
    });

    it('should handle charts without destroy method', () => {
      const invalidChart = {};
      DataStore.setChart('timeline', invalidChart);
      
      // Should not throw error
      expect(() => DataStore.destroyAllCharts()).not.toThrow();
    });
  });

  describe('series visibility', () => {
    it('should set and track series visibility', () => {
      DataStore.setSeriesVisibility('table1', true);
      DataStore.setSeriesVisibility('table2', false);
      
      expect(DataStore.seriesVisibility).toEqual({
        table1: true,
        table2: false
      });
    });
  });

  describe('data aggregation', () => {
    beforeEach(() => {
      // Set up test data
      DataStore.setQueryData([
        { timestamp: new Date(), executionTimeMs: 100 }
      ]);
      DataStore.setWalData([
        { timestamp: new Date(), table: 'test_table', amplification: 1.5 }
      ]);
      DataStore.setErrorData([
        { timestamp: new Date(), errorType: 'Connection Limit' }
      ]);
      DataStore.setPartitionClosingData([
        { timestamp: new Date(), table: 'test_table' }
      ]);
      DataStore.addFileMetadata('test.log', new Date(), new Date(), 100);
    });

    it('should return all data', () => {
      const allData = DataStore.getAllData();
      
      expect(allData).toHaveProperty('queries');
      expect(allData).toHaveProperty('walJobs');
      expect(allData).toHaveProperty('walCommits');
      expect(allData).toHaveProperty('errors');
      expect(allData).toHaveProperty('partitionClosings');
      expect(allData).toHaveProperty('pgwireConnections');
      expect(allData).toHaveProperty('fileMetadata');
      
      expect(allData.queries).toHaveLength(1);
      expect(allData.walJobs).toHaveLength(1);
      expect(allData.errors).toHaveLength(1);
      expect(allData.partitionClosings).toHaveLength(1);
      expect(allData.fileMetadata).toHaveLength(1);
    });

    it('should get unique tables from WAL and error data', () => {
      DataStore.setWalData([
        { table: 'table1' },
        { table: 'table2' },
        { table: 'table1' } // duplicate
      ]);
      DataStore.setErrorData([
        { table: 'table2' },
        { table: 'table3' }
      ]);
      DataStore.setPartitionClosingData([
        { table: 'table4' }
      ]);
      
      const uniqueTables = DataStore.getUniqueTables();
      
      expect(uniqueTables).toEqual(['table1', 'table2', 'table3', 'table4']);
    });

    it('should filter data by table', () => {
      DataStore.setWalData([
        { table: 'table1', data: 'wal1' },
        { table: 'table2', data: 'wal2' }
      ]);
      DataStore.setErrorData([
        { table: 'table1', data: 'error1' },
        { table: 'table2', data: 'error2' }
      ]);
      
      const filtered = DataStore.filterByTable('table1');
      
      expect(filtered.walJobs).toHaveLength(1);
      expect(filtered.walJobs[0].data).toBe('wal1');
      expect(filtered.errors).toHaveLength(1);
      expect(filtered.errors[0].data).toBe('error1');
      expect(filtered.queries).toHaveLength(1); // queries are not filtered by table
    });

    it('should return all data when filtering by "all"', () => {
      const allData = DataStore.filterByTable('all');
      const directAllData = DataStore.getAllData();
      
      expect(allData).toEqual(directAllData);
    });
  });

  describe('event system', () => {
    it('should add event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      DataStore.on('testEvent', callback1);
      DataStore.on('testEvent', callback2);
      
      expect(DataStore.listeners.testEvent).toHaveLength(2);
    });

    it('should emit events to all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const testData = { test: 'data' };
      
      DataStore.on('testEvent', callback1);
      DataStore.on('testEvent', callback2);
      
      DataStore.emit('testEvent', testData);
      
      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
    });

    it('should remove event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      DataStore.on('testEvent', callback1);
      DataStore.on('testEvent', callback2);
      DataStore.off('testEvent', callback1);
      
      DataStore.emit('testEvent', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should handle removing non-existent listeners gracefully', () => {
      const callback = jest.fn();
      
      // Should not throw
      expect(() => DataStore.off('nonExistentEvent', callback)).not.toThrow();
    });

    it('should emit events when setting data', () => {
      const queryCallback = jest.fn();
      const walCallback = jest.fn();
      
      DataStore.on('queryDataChanged', queryCallback);
      DataStore.on('walDataChanged', walCallback);
      
      const queryData = [{ id: 1 }];
      const walData = [{ id: 2 }];
      
      DataStore.setQueryData(queryData);
      DataStore.setWalData(walData);
      
      expect(queryCallback).toHaveBeenCalledWith(queryData);
      expect(walCallback).toHaveBeenCalledWith(walData);
    });

    it('should emit fileMetadataChanged when adding file metadata', () => {
      const callback = jest.fn();
      DataStore.on('fileMetadataChanged', callback);
      
      DataStore.addFileMetadata('test.log', new Date(), new Date(), 100);
      
      expect(callback).toHaveBeenCalledWith(DataStore.fileMetadata);
    });

    it('should emit seriesVisibilityChanged when setting series visibility', () => {
      const callback = jest.fn();
      DataStore.on('seriesVisibilityChanged', callback);
      
      DataStore.setSeriesVisibility('table1', true);
      
      expect(callback).toHaveBeenCalledWith(DataStore.seriesVisibility);
    });
  });
});