/**
 * DataProcessor module - Data transformation and statistical analysis
 */

/**
 * Groups data by second intervals
 * @param {Array} data - Array of data points with timestamps
 * @returns {Array} Grouped data by second
 */
export function groupBySecond(data) {
  const grouped = {};
  
  data.forEach(item => {
    const time = new Date(item.timestamp);
    time.setMilliseconds(0);
    const key = time.toISOString();
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return Object.entries(grouped).map(([timestamp, items]) => ({
    timestamp: new Date(timestamp),
    items: items,
    avgTime: items.reduce((sum, item) => sum + item.executionTimeMs, 0) / items.length,
    maxTime: Math.max(...items.map(item => item.executionTimeMs)),
    count: items.length
  })).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Groups data by custom time intervals
 * @param {Array} data - Array of data points with timestamps
 * @param {number} intervalMs - Interval in milliseconds
 * @returns {Array} Grouped data by interval
 */
export function groupByInterval(data, intervalMs = 500) {
  const grouped = {};
  
  data.forEach(item => {
    const time = new Date(item.timestamp);
    // Round down to the nearest interval
    const intervalKey = Math.floor(time.getTime() / intervalMs) * intervalMs;
    
    if (!grouped[intervalKey]) {
      grouped[intervalKey] = [];
    }
    grouped[intervalKey].push(item);
  });
  
  return Object.entries(grouped).map(([timestamp, items]) => ({
    timestamp: new Date(parseInt(timestamp)),
    items: items,
    avgTime: items.reduce((sum, item) => sum + item.executionTimeMs, 0) / items.length,
    maxTime: Math.max(...items.map(item => item.executionTimeMs)),
    count: items.length
  })).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Gets top queries by execution time
 * @param {Array} data - Query data
 * @param {number} limit - Number of top queries to return
 * @returns {Array} Top queries with statistics
 */
export function getTopQueries(data, limit = 12) {
  const queryStats = {};
  
  data.forEach(item => {
    const key = item.sqlPreview;
    if (!queryStats[key]) {
      queryStats[key] = {
        query: key,
        fullSql: item.fullSql,
        times: [],
        count: 0,
        totalTime: 0
      };
    }
    queryStats[key].times.push(item.executionTimeMs);
    queryStats[key].count++;
    queryStats[key].totalTime += item.executionTimeMs;
  });
  
  // Calculate statistics for each query
  Object.values(queryStats).forEach(stat => {
    stat.avgTime = stat.totalTime / stat.count;
    stat.maxTime = Math.max(...stat.times);
    stat.minTime = Math.min(...stat.times);
    stat.times.sort((a, b) => a - b);
    stat.p99 = calculatePercentile(stat.times, 99);
    stat.p95 = calculatePercentile(stat.times, 95);
    stat.p50 = calculatePercentile(stat.times, 50);
  });
  
  // Sort by max time and return top N
  return Object.values(queryStats)
    .sort((a, b) => b.maxTime - a.maxTime)
    .slice(0, limit);
}

/**
 * Calculates percentile value from sorted array
 * @param {Array} sortedArray - Sorted array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
export function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Calculates basic statistics for a dataset
 * @param {Array} data - Array of numbers
 * @returns {Object} Statistics object
 */
export function calculateStatistics(data) {
  if (!data || data.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      p25: 0,
      p75: 0,
      p95: 0,
      p99: 0
    };
  }
  
  const sorted = [...data].sort((a, b) => a - b);
  const count = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  
  // Calculate standard deviation
  const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  return {
    count,
    mean,
    median: calculatePercentile(sorted, 50),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
    p25: calculatePercentile(sorted, 25),
    p75: calculatePercentile(sorted, 75),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99)
  };
}

/**
 * Groups data by table name
 * @param {Array} data - Data with table property
 * @returns {Object} Data grouped by table
 */
export function groupByTable(data) {
  const grouped = {};
  
  data.forEach(item => {
    const table = item.table || 'unknown';
    if (!grouped[table]) {
      grouped[table] = [];
    }
    grouped[table].push(item);
  });
  
  return grouped;
}

/**
 * Calculates time-based metrics for data
 * @param {Array} data - Data with timestamps
 * @returns {Object} Time-based metrics
 */
export function calculateTimeMetrics(data) {
  if (!data || data.length === 0) {
    return {
      startTime: null,
      endTime: null,
      duration: 0,
      rate: 0
    };
  }
  
  const timestamps = data.map(d => new Date(d.timestamp).getTime());
  const startTime = new Date(Math.min(...timestamps));
  const endTime = new Date(Math.max(...timestamps));
  const duration = (endTime - startTime) / 1000; // Duration in seconds
  
  return {
    startTime,
    endTime,
    duration,
    rate: data.length / Math.max(1, duration) // Items per second
  };
}

/**
 * Creates histogram bins for data distribution
 * @param {Array} data - Array of numbers
 * @param {number} binCount - Number of bins
 * @returns {Array} Histogram bins
 */
export function createHistogramBins(data, binCount = 20) {
  if (!data || data.length === 0) return [];
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / binCount;
  
  const bins = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    
    bins.push({
      start: binStart,
      end: binEnd,
      label: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
      count: 0,
      values: []
    });
  }
  
  // Populate bins
  data.forEach(value => {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      binCount - 1
    );
    bins[binIndex].count++;
    bins[binIndex].values.push(value);
  });
  
  return bins;
}

/**
 * Filters data by time range
 * @param {Array} data - Data with timestamps
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Array} Filtered data
 */
export function filterByTimeRange(data, startTime, endTime) {
  return data.filter(item => {
    const timestamp = new Date(item.timestamp);
    return timestamp >= startTime && timestamp <= endTime;
  });
}

/**
 * Aggregates WAL metrics by table
 * @param {Array} walData - WAL job data
 * @returns {Object} Aggregated metrics by table
 */
export function aggregateWalMetrics(walData) {
  const metrics = {};
  
  walData.forEach(job => {
    const table = job.table;
    
    if (!metrics[table]) {
      metrics[table] = {
        table,
        jobs: [],
        totalRows: 0,
        totalTime: 0,
        amplifications: []
      };
    }
    
    metrics[table].jobs.push(job);
    metrics[table].totalRows += job.rows;
    metrics[table].totalTime += job.timeMs;
    metrics[table].amplifications.push(job.amplification);
  });
  
  // Calculate averages
  Object.values(metrics).forEach(metric => {
    metric.avgAmplification = metric.amplifications.reduce((a, b) => a + b, 0) / metric.amplifications.length;
    metric.avgRate = metric.totalRows / Math.max(1, metric.totalTime / 1000);
    metric.jobCount = metric.jobs.length;
  });
  
  return metrics;
}