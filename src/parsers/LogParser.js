/**
 * LogParser module - Parses QuestDB log files
 * Extracts queries, WAL operations, partition events, and system events
 */

// Regex patterns for different log entry types
const PATTERNS = {
  query: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?QueryProgress\s+(fin|exe).*?sql=`([^`]+)`.*?time=(\d+)]/,
  walJob: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?ApplyWal2TableJob job (?:finished|ejected) \[table=([^,]+), seqTxn=\d+, transactions=(\d+), rows=(\d+), time=(\d+)ms, rate=(\d+)rows\/s, ampl=([\d.]+)\]/,
  walCommit: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?WalWriter commit \[wal=\/([^\/]+)\/.*?, segTxn=\d+, seqTxn=\d+, rowLo=(\d+), rowHi=(\d+),/,
  partitionClosing: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?TableReader closed partition \[path=\/([^,~\/]+)(?:~\d+)?, timestamp=([^\]]+)\]/,
  pgwireConnection: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?pg-server connected \[ip=([^,]+), fd=(\d+), connCount=(\d+)\]/,
  o3Partition: /o3 split partition \[table=([^,]+)/i,
  partitionSquashing: /squashing partitions \[table=([^,]+)/i,
  mergePartition: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*?TableWriter merged partition \[table=`([^`]+)`, ts=.*?, txn=(\d+), rows=(\d+)\]/,
  connectionLimit: /max connection limit reached.*unregistered listener/i
};

/**
 * Normalizes table names by removing tilde suffixes
 * @param {string} tableName - Raw table name from logs
 * @returns {string} Normalized table name
 */
export function normalizeTableName(tableName) {
  return tableName.replace(/~\d+$/, '');
}

/**
 * Parses a query log entry
 * @param {string} line - Log line
 * @param {string} fileName - Source file name
 * @returns {Object|null} Parsed query data
 */
function parseQueryEntry(line, fileName) {
  const match = line.match(PATTERNS.query);
  if (!match || match[2] !== 'fin') return null;
  
  const [, timestampStr, , sql, timeNanos] = match;
  
  try {
    const timestamp = new Date(timestampStr);
    const timeMs = parseInt(timeNanos) / 1_000_000; // Convert nanoseconds to milliseconds
    const sqlPreview = sql.split(' ').slice(0, 5).join(' ') + (sql.split(' ').length > 5 ? '...' : '');
    
    return {
      timestamp,
      executionTimeMs: timeMs,
      sqlPreview,
      fullSql: sql,
      file: fileName
    };
  } catch (e) {
    console.warn('Error parsing query line:', e);
    return null;
  }
}

/**
 * Parses a WAL job entry
 * @param {string} line - Log line
 * @param {string} fileName - Source file name
 * @returns {Object|null} Parsed WAL job data
 */
function parseWalJobEntry(line, fileName) {
  const match = line.match(PATTERNS.walJob);
  if (!match) return null;
  
  const [, timestampStr, table, transactions, rows, timeMs, rate, amplification] = match;
  
  try {
    return {
      timestamp: new Date(timestampStr),
      table: normalizeTableName(table),
      transactions: parseInt(transactions),
      rows: parseInt(rows),
      timeMs: parseInt(timeMs),
      rate: parseInt(rate),
      amplification: parseFloat(amplification),
      file: fileName
    };
  } catch (e) {
    console.warn('Error parsing WAL job line:', e);
    return null;
  }
}

/**
 * Parses a WAL commit entry
 * @param {string} line - Log line
 * @param {string} fileName - Source file name
 * @returns {Object|null} Parsed WAL commit data
 */
function parseWalCommitEntry(line, fileName) {
  const match = line.match(PATTERNS.walCommit);
  if (!match) return null;
  
  const [, timestampStr, table, rowLo, rowHi] = match;
  
  try {
    const timestamp = new Date(timestampStr);
    const rowsCommitted = parseInt(rowHi) - parseInt(rowLo);
    
    return {
      timestamp,
      table: normalizeTableName(table),
      rowsCommitted,
      rowLo: parseInt(rowLo),
      rowHi: parseInt(rowHi),
      file: fileName
    };
  } catch (e) {
    console.warn('Error parsing WAL commit line:', e);
    return null;
  }
}

/**
 * Parses a partition closing entry
 * @param {string} line - Log line
 * @param {string} fileName - Source file name
 * @returns {Object|null} Parsed partition closing data
 */
function parsePartitionClosingEntry(line, fileName) {
  const match = line.match(PATTERNS.partitionClosing);
  if (!match) return null;
  
  const [, timestampStr, table, partitionTimestamp] = match;
  
  try {
    return {
      timestamp: new Date(timestampStr),
      table: normalizeTableName(table),
      partitionTimestamp,
      file: fileName
    };
  } catch (e) {
    console.warn('Error parsing partition closing line:', e);
    return null;
  }
}

/**
 * Parses system event entries (errors, partition operations, etc.)
 * @param {string} line - Log line
 * @param {string} fileName - Source file name
 * @returns {Object|null} Parsed event data
 */
function parseSystemEvent(line, fileName) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
  if (!timestampMatch) return null;
  
  const timestamp = new Date(timestampMatch[1]);
  
  // Check for connection limit
  if (PATTERNS.connectionLimit.test(line)) {
    return {
      timestamp,
      errorType: 'Connection Limit',
      message: line.substring(0, 200),
      file: fileName
    };
  }
  
  // Check for O3 partition split
  const o3Match = line.match(PATTERNS.o3Partition);
  if (o3Match) {
    return {
      timestamp,
      errorType: 'O3 Partition Split',
      table: normalizeTableName(o3Match[1]),
      message: `O3 partition split for table: ${o3Match[1]}`,
      file: fileName
    };
  }
  
  // Check for partition squashing
  const squashMatch = line.match(PATTERNS.partitionSquashing);
  if (squashMatch) {
    return {
      timestamp,
      errorType: 'Partition Squashing',
      table: normalizeTableName(squashMatch[1]),
      message: `Squashing partitions for table: ${squashMatch[1]}`,
      file: fileName
    };
  }
  
  // Check for merge partition
  const mergeMatch = line.match(PATTERNS.mergePartition);
  if (mergeMatch) {
    return {
      timestamp,
      errorType: 'Merge Partition',
      table: normalizeTableName(mergeMatch[2]),
      message: `Merged partition for table: ${mergeMatch[2]}, rows: ${mergeMatch[4]}`,
      file: fileName
    };
  }
  
  return null;
}

/**
 * Main parsing function for QuestDB log files
 * @param {string} logContent - Raw log file content
 * @param {string} fileName - Source file name
 * @param {Function} progressCallback - Progress update callback
 * @returns {Object} Parsed data categorized by type
 */
export function parseQuestDBLog(logContent, fileName, progressCallback) {
  const lines = logContent.split('\n');
  const totalLines = lines.length;
  
  const result = {
    queries: [],
    walJobs: [],
    walCommits: [],
    partitionClosings: [],
    pgwireConnections: [],
    systemEvents: []
  };
  
  for (let i = 0; i < totalLines; i++) {
    const line = lines[i];
    
    // Update progress every 1000 lines
    if (progressCallback && i % 1000 === 0) {
      progressCallback(i, totalLines);
    }
    
    // Try parsing as different entry types
    const queryEntry = parseQueryEntry(line, fileName);
    if (queryEntry) {
      result.queries.push(queryEntry);
      continue;
    }
    
    const walJobEntry = parseWalJobEntry(line, fileName);
    if (walJobEntry) {
      result.walJobs.push(walJobEntry);
      continue;
    }
    
    const walCommitEntry = parseWalCommitEntry(line, fileName);
    if (walCommitEntry) {
      result.walCommits.push(walCommitEntry);
      continue;
    }
    
    const partitionClosingEntry = parsePartitionClosingEntry(line, fileName);
    if (partitionClosingEntry) {
      result.partitionClosings.push(partitionClosingEntry);
      continue;
    }
    
    // Check for pgwire connections
    const pgwireMatch = line.match(PATTERNS.pgwireConnection);
    if (pgwireMatch) {
      try {
        result.pgwireConnections.push({
          timestamp: new Date(pgwireMatch[1]),
          ip: pgwireMatch[2],
          fd: parseInt(pgwireMatch[3]),
          connCount: parseInt(pgwireMatch[4]),
          file: fileName
        });
        continue;
      } catch (e) {
        console.warn('Error parsing pgwire connection:', e);
      }
    }
    
    // Check for system events
    const systemEvent = parseSystemEvent(line, fileName);
    if (systemEvent) {
      result.systemEvents.push(systemEvent);
    }
  }
  
  return result;
}

// Export patterns for testing
export { PATTERNS };