/**
 * Sample log data for testing
 */

export const sampleLogContent = `2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [id=12345, sql=\`SELECT * FROM trades WHERE symbol = 'BTC'\`, time=285890000]
2025-09-03T13:24:12.148726Z I i.q.c.ApplyWal2TableJob job finished [table=trades~21, seqTxn=100, transactions=5, rows=1000, time=50ms, rate=20000rows/s, ampl=1.5]
2025-09-03T13:24:13.423456Z I i.q.c.wal.WalWriter commit [wal=/trades~21/wal335/323, segTxn=22, seqTxn=323, rowLo=80337, rowHi=80437, memUsed=80437]
2025-09-03T13:24:14.567890Z I i.q.c.TableReader closed partition [path=/trades~21, timestamp=2025-09-03T18:53:41.000001Z]
2025-09-03T13:24:15.789012Z E i.q.n.TcpConnectionListener failed to accept connection [errno=24] max connection limit reached: unregistered listener
2025-09-03T13:24:16.123456Z I i.q.g.c.o.O3PartitionJob o3 split partition [table=user_events~21, partition=2025-09-03T18:53:41.000001Z]
2025-09-03T13:24:17.456789Z I i.q.c.wal.seq.TableSquashJob squashing partitions [table=sensor_data~42, partitions=3, rows=45123]
2025-09-03T13:24:18.789123Z I i.q.c.TableWriter merged partition [table=\`mm_audit_trails\`, ts=2025-09-03T18:53:41.000001Z, txn=1457075, rows=120862]
2025-09-03T13:24:19.012345Z I i.q.n.pg.PgConnectionContext pg-server connected [ip=127.0.0.1, fd=15, connCount=5]`;

export const sampleParsedData = {
  queries: [
    {
      timestamp: new Date('2025-09-03T13:24:11.877189Z'),
      executionTimeMs: 285.89,
      sqlPreview: "SELECT * FROM trades WHERE...",
      fullSql: "SELECT * FROM trades WHERE symbol = 'BTC'",
      file: 'test.log'
    }
  ],
  walJobs: [
    {
      timestamp: new Date('2025-09-03T13:24:12.148726Z'),
      table: 'trades',
      transactions: 5,
      rows: 1000,
      timeMs: 50,
      rate: 20000,
      amplification: 1.5,
      file: 'test.log'
    }
  ],
  walCommits: [
    {
      timestamp: new Date('2025-09-03T13:24:13.423456Z'),
      table: 'trades',
      rowsCommitted: 100,
      rowLo: 80337,
      rowHi: 80437,
      file: 'test.log'
    }
  ],
  partitionClosings: [
    {
      timestamp: new Date('2025-09-03T13:24:14.567890Z'),
      table: 'trades',
      partitionTimestamp: '2025-09-03T18:53:41.000001Z',
      file: 'test.log'
    }
  ],
  pgwireConnections: [
    {
      timestamp: new Date('2025-09-03T13:24:19.012345Z'),
      ip: '127.0.0.1',
      fd: 15,
      connCount: 5,
      file: 'test.log'
    }
  ],
  systemEvents: [
    {
      timestamp: new Date('2025-09-03T13:24:15.789012Z'),
      errorType: 'Connection Limit',
      message: '2025-09-03T13:24:15.789012Z E i.q.n.TcpConnectionListener failed to accept connection [errno=24] max connection limit reached: unregistered listener',
      file: 'test.log'
    },
    {
      timestamp: new Date('2025-09-03T13:24:16.123456Z'),
      errorType: 'O3 Partition Split',
      table: 'user_events',
      message: 'O3 partition split for table: user_events~21',
      file: 'test.log'
    },
    {
      timestamp: new Date('2025-09-03T13:24:17.456789Z'),
      errorType: 'Partition Squashing',
      table: 'sensor_data',
      message: 'Squashing partitions for table: sensor_data~42',
      file: 'test.log'
    },
    {
      timestamp: new Date('2025-09-03T13:24:18.789123Z'),
      errorType: 'Merge Partition',
      table: 'mm_audit_trails',
      message: 'Merged partition for table: mm_audit_trails, rows: 120862',
      file: 'test.log'
    }
  ]
};

export const createMockFile = (name = 'test.log', content = sampleLogContent) => {
  // Create a mock File object
  const file = new File([content], name, { type: 'text/plain' });
  return file;
};

export const createMockFileList = (files) => {
  const fileList = {
    length: files.length,
    item: (index) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) {
        yield files[i];
      }
    }
  };
  
  // Add indexed properties
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  
  return fileList;
};

export const createMockProgress = () => {
  const progressCallbacks = [];
  
  return {
    addCallback: (callback) => progressCallbacks.push(callback),
    triggerProgress: (current, total) => {
      progressCallbacks.forEach(callback => callback(current, total));
    },
    callbacks: progressCallbacks
  };
};

export const createTimeSeriesData = (count = 10, startTime = new Date('2025-01-01T10:00:00Z')) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * 1000); // 1 second apart
    data.push({
      timestamp,
      executionTimeMs: Math.random() * 100 + 10, // 10-110ms
      sqlPreview: `SELECT ${i} FROM table`,
      fullSql: `SELECT ${i} FROM table WHERE id = ${i}`,
      file: 'test.log'
    });
  }
  return data;
};

export const createWalData = (count = 5, startTime = new Date('2025-01-01T10:00:00Z')) => {
  const tables = ['trades', 'users', 'orders', 'products'];
  const data = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * 2000); // 2 seconds apart
    data.push({
      timestamp,
      table: tables[i % tables.length],
      transactions: Math.floor(Math.random() * 10) + 1,
      rows: Math.floor(Math.random() * 1000) + 100,
      timeMs: Math.floor(Math.random() * 100) + 10,
      rate: Math.floor(Math.random() * 10000) + 1000,
      amplification: Math.random() * 2 + 0.5,
      file: 'test.log'
    });
  }
  
  return data;
};

export const createErrorData = (count = 3, startTime = new Date('2025-01-01T10:00:00Z')) => {
  const errorTypes = ['Connection Limit', 'O3 Partition Split', 'Partition Squashing', 'Merge Partition'];
  const tables = ['trades', 'users', 'orders'];
  const data = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * 3000); // 3 seconds apart
    const errorType = errorTypes[i % errorTypes.length];
    
    const event = {
      timestamp,
      errorType,
      message: `${errorType} event occurred`,
      file: 'test.log'
    };
    
    // Add table property for some error types
    if (errorType !== 'Connection Limit') {
      event.table = tables[i % tables.length];
    }
    
    data.push(event);
  }
  
  return data;
};