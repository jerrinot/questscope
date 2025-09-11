import { parseQuestDBLog, normalizeTableName, PATTERNS } from '../../../src/parsers/LogParser';

describe('LogParser', () => {
  describe('normalizeTableName', () => {
    it('should remove tilde suffixes from table names', () => {
      expect(normalizeTableName('my_table~20')).toBe('my_table');
      expect(normalizeTableName('another_table~5')).toBe('another_table');
      expect(normalizeTableName('plain_table')).toBe('plain_table');
    });
  });

  describe('parseQuestDBLog', () => {
    it('should parse query entries correctly', () => {
      const logContent = `2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [id=12345, sql=\`SELECT * FROM trades WHERE symbol = 'BTC'\`, time=285890000]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0]).toMatchObject({
        executionTimeMs: 285.89,
        sqlPreview: "SELECT * FROM trades WHERE...",
        fullSql: "SELECT * FROM trades WHERE symbol = 'BTC'",
        file: 'test.log'
      });
    });

    it('should parse WAL job entries', () => {
      const logContent = `2025-09-03T13:24:22.148726Z I i.q.c.ApplyWal2TableJob job finished [table=trades~21, seqTxn=100, transactions=5, rows=1000, time=50ms, rate=20000rows/s, ampl=1.5]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.walJobs).toHaveLength(1);
      expect(result.walJobs[0]).toMatchObject({
        table: 'trades',
        transactions: 5,
        rows: 1000,
        timeMs: 50,
        rate: 20000,
        amplification: 1.5,
        file: 'test.log'
      });
    });

    it('should parse WAL commit entries', () => {
      const logContent = `2025-09-03T13:24:22.148726Z I i.q.c.w.WalWriter commit [wal=/trades~21/wal335/323, segTxn=1, seqTxn=2, rowLo=80337, rowHi=80437, minTs=1725369862148726, maxTs=1725369862148726]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.walCommits).toHaveLength(1);
      expect(result.walCommits[0]).toMatchObject({
        table: 'trades',
        rowsCommitted: 100,
        rowLo: 80337,
        rowHi: 80437,
        file: 'test.log'
      });
    });

    it('should parse partition closing entries', () => {
      const logContent = `2025-09-03T13:24:22.148726Z I i.q.c.TableReader closed partition [path=/trades~5, timestamp=2025-09-03T00:00:00.000000Z]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.partitionClosings).toHaveLength(1);
      expect(result.partitionClosings[0]).toMatchObject({
        table: 'trades',
        partitionTimestamp: '2025-09-03T00:00:00.000000Z',
        file: 'test.log'
      });
    });

    it('should parse system events', () => {
      const logContent = `2025-09-03T13:24:22.148726Z W server max connection limit reached [unregistered listener]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.systemEvents).toHaveLength(1);
      expect(result.systemEvents[0]).toMatchObject({
        errorType: 'Connection Limit',
        file: 'test.log'
      });
    });

    it('should parse O3 partition split events', () => {
      const logContent = `2025-09-03T13:24:22.148726Z I i.q.c.TableWriter o3 split partition [table=trades~10, ts=2025-09-03T00:00:00.000000Z]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.systemEvents).toHaveLength(1);
      expect(result.systemEvents[0]).toMatchObject({
        errorType: 'O3 Partition Split',
        table: 'trades',
        file: 'test.log'
      });
    });

    it('should handle multiple log entries', () => {
      const logContent = `2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [id=1, sql=\`SELECT count(*) FROM trades\`, time=100000000]
2025-09-03T13:24:12.877189Z I i.q.g.e.QueryProgress fin [id=2, sql=\`SELECT avg(price) FROM trades\`, time=200000000]
2025-09-03T13:24:13.877189Z I i.q.c.ApplyWal2TableJob job finished [table=trades, seqTxn=100, transactions=5, rows=1000, time=50ms, rate=20000rows/s, ampl=1.5]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.queries).toHaveLength(2);
      expect(result.walJobs).toHaveLength(1);
    });

    it('should call progress callback', () => {
      const logContent = Array(5000).fill('dummy line').join('\n');
      const progressCallback = jest.fn();
      
      parseQuestDBLog(logContent, 'test.log', progressCallback);
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls[0][0]).toBe(0);
      expect(progressCallback.mock.calls[0][1]).toBe(5000);
    });

    it('should handle malformed log entries gracefully', () => {
      const logContent = `This is not a valid log entry
2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [malformed]
2025-09-03T13:24:12.877189Z I i.q.g.e.QueryProgress fin [id=1, sql=\`SELECT * FROM trades\`, time=not_a_number]`;
      
      const result = parseQuestDBLog(logContent, 'test.log');
      
      expect(result.queries).toHaveLength(0);
      expect(result.walJobs).toHaveLength(0);
      expect(result.systemEvents).toHaveLength(0);
    });
  });

  describe('PATTERNS', () => {
    it('should match query pattern', () => {
      const line = `2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [id=12345, sql=\`SELECT * FROM trades\`, time=285890000]`;
      expect(PATTERNS.query.test(line)).toBe(true);
    });

    it('should match WAL job pattern', () => {
      const line = `2025-09-03T13:24:22.148726Z I i.q.c.ApplyWal2TableJob job finished [table=trades, seqTxn=100, transactions=5, rows=1000, time=50ms, rate=20000rows/s, ampl=1.5]`;
      expect(PATTERNS.walJob.test(line)).toBe(true);
    });

    it('should match WAL commit pattern', () => {
      const line = `2025-09-03T13:24:22.148726Z I i.q.c.w.WalWriter commit [wal=/trades/wal335/323, segTxn=1, seqTxn=2, rowLo=80337, rowHi=80437, minTs=1725369862148726]`;
      expect(PATTERNS.walCommit.test(line)).toBe(true);
    });
  });
});