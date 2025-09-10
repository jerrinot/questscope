/**
 * ChartManager module - Handles all chart creation and management
 */

import dataStore from '../store/DataStore.js';
import { getTableColor, formatUTCTime, COMMON_CHART_OPTIONS, COLOR_PALETTE } from '../config/ChartConfig.js';

// Import additional chart functions
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
} from './ChartManagerExtensions.js';

/**
 * Chart creation functions extracted from index.html
 */

// Timeline Chart
export function createTimelineChart(timeGrouped) {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeGrouped.map(d => d.timestamp),
            datasets: [{
                label: 'Average Execution Time (ms)',
                data: timeGrouped.map(d => d.avgTime),
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            millisecond: 'HH:mm:ss.SSS',
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM dd HH:mm',
                            week: 'MMM dd',
                            month: 'MMM yyyy'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            const date = new Date(value);
                            const hours = date.getUTCHours().toString().padStart(2, '0');
                            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                            const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                            return `${hours}:${minutes}:${seconds}`;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Execution Time (ms)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        },
                        afterLabel: function(context) {
                            const dataPoint = timeGrouped[context.dataIndex];
                            return `Queries: ${dataPoint.count}`;
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('timeline', chart);
    return chart;
}

// Frequency Chart
export function createFrequencyChart(timeGrouped) {
    const ctx = document.getElementById('frequencyChart').getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeGrouped.map(d => d.timestamp),
            datasets: [{
                label: 'Queries per Second',
                data: timeGrouped.map(d => d.count),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            millisecond: 'HH:mm:ss.SSS',
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM dd HH:mm',
                            week: 'MMM dd',
                            month: 'MMM yyyy'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            const date = new Date(value);
                            const hours = date.getUTCHours().toString().padStart(2, '0');
                            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                            const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                            return `${hours}:${minutes}:${seconds}`;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Queries per Second'
                    }
                }
            }
        }
    });
    
    dataStore.setChart('frequency', chart);
    return chart;
}

// Histogram Chart
export function createHistogramChart(data) {
    const ctx = document.getElementById('histogramChart').getContext('2d');
    
    // Create histogram bins
    const times = data.map(d => d.executionTimeMs);
    // Sort times array for percentile calculation
    const sortedTimes = [...times].sort((a, b) => a - b);
    // Use sorted array to get max and 99th percentile without spread operator
    const maxInData = sortedTimes[sortedTimes.length - 1];
    const p99Value = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const maxTime = Math.min(maxInData, p99Value); // Cap at 99th percentile
    const binSize = maxTime / 50;
    const bins = Array(50).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < 50; i++) {
        binLabels.push((i * binSize).toFixed(1));
    }
    
    times.forEach(time => {
        if (time <= maxTime) {
            const binIndex = Math.min(Math.floor(time / binSize), 49);
            bins[binIndex]++;
        }
    });
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Frequency',
                data: bins,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Execution Time (ms)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                }
            }
        }
    });
    
    dataStore.setChart('histogram', chart);
    return chart;
}

// Box Plot Chart (using Plotly)
export function createBoxPlot(data) {
    const times = data.map(d => d.executionTimeMs);
    times.sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1 = times[Math.floor(times.length * 0.25)];
    const median = times[Math.floor(times.length * 0.5)];
    const q3 = times[Math.floor(times.length * 0.75)];
    const iqr = q3 - q1;
    
    // Filter outliers for display
    const maxDisplay = Math.min(q3 + 1.5 * iqr, times[Math.floor(times.length * 0.99)]);
    const filteredTimes = times.filter(t => t <= maxDisplay);
    
    const trace = {
        y: filteredTimes,
        type: 'box',
        name: 'Execution Time',
        boxpoints: 'outliers',
        marker: {
            color: 'rgb(107, 174, 214)'
        }
    };
    
    const layout = {
        title: 'Execution Time Distribution',
        yaxis: {
            title: 'Execution Time (ms)'
        },
        margin: { t: 30 }
    };
    
    Plotly.newPlot('boxPlot', [trace], layout, {responsive: true});
}

// Helper function for grouping data by time intervals
function groupByInterval(data, intervalMs = 500) {
    const grouped = {};
    
    data.forEach(item => {
        const timestamp = new Date(item.timestamp);
        const intervalStart = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
        const key = intervalStart.getTime();
        
        if (!grouped[key]) {
            grouped[key] = {
                timestamp: intervalStart,
                items: [],
                totalTime: 0,
                count: 0
            };
        }
        
        grouped[key].items.push(item);
        grouped[key].totalTime += item.executionTimeMs;
        grouped[key].count++;
    });
    
    const result = Object.values(grouped).map(group => ({
        timestamp: group.timestamp,
        items: group.items,
        avgTime: group.totalTime / group.count,
        count: group.count
    }));
    
    return result.sort((a, b) => a.timestamp - b.timestamp);
}

// Heatmaps Chart (complex multi-chart function using Plotly)
export function createHeatmaps(data, topQueries) {
    // Use sub-second intervals (500ms) for finer granularity instead of full seconds
    const timeGrouped = groupByInterval(data, 500);
    
    // Shorten query names for better horizontal space usage
    const queryNames = topQueries.map((q, i) => `Q${i+1}: ${q.query.substring(0, 20)}...`);
    
    // Create time labels with more samples for better horizontal usage
    const timeLabels = timeGrouped.map(d => d.timestamp.toISOString().slice(11, 23)); // Include milliseconds
    
    // Use more time points for better horizontal space utilization
    const sampleRate = Math.max(1, Math.floor(timeLabels.length / 80)); // Increased granularity for better time resolution
    const sampledTimeLabels = timeLabels.filter((_, i) => i % sampleRate === 0);
    const sampledTimeData = timeGrouped.filter((_, i) => i % sampleRate === 0);
    
    // Prepare heatmap data for average times, max times, P99, AND count data
    const avgHeatmapData = [];
    const maxHeatmapData = [];
    const p99HeatmapData = [];
    const countData = [];
    
    queryNames.forEach((queryName, index) => {
        const fullQueryName = topQueries[index].query;
        const avgRow = [];
        const maxRow = [];
        const p99Row = [];
        const countRow = [];
        
        sampledTimeData.forEach(timePoint => {
            const queriesInTimePoint = timePoint.items.filter(item => item.sqlPreview === fullQueryName);
            if (queriesInTimePoint.length > 0) {
                const times = queriesInTimePoint.map(item => item.executionTimeMs);
                times.sort((a, b) => a - b);
                
                avgRow.push(times.reduce((sum, t) => sum + t, 0) / times.length);
                maxRow.push(times.reduce((max, t) => t > max ? t : max, times[0]));
                
                // Calculate P99 (99th percentile)
                const p99Index = Math.floor(times.length * 0.99);
                p99Row.push(times[Math.min(p99Index, times.length - 1)]);
                
                countRow.push(queriesInTimePoint.length);
            } else {
                avgRow.push(null);
                maxRow.push(null);
                p99Row.push(null);
                countRow.push(0);
            }
        });
        
        avgHeatmapData.push(avgRow);
        maxHeatmapData.push(maxRow);
        p99HeatmapData.push(p99Row);
        countData.push(countRow);
    });
    
    // Average heatmap with custom text showing counts
    const avgTrace = {
        z: avgHeatmapData,
        x: sampledTimeLabels,
        y: queryNames,
        type: 'heatmap',
        colorscale: 'YlOrRd',
        showscale: true,
        zauto: true,  // Enable auto-scale by default
        colorbar: {
            title: 'Avg Time (ms)',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>Avg Time: %{z:.2f}ms<br>Count: %{text}<extra></extra>',
        text: countData,
        texttemplate: '%{text}',
        textfont: {
            size: 8,
            color: 'black'
        }
    };
    
    const avgLayout = {
        title: {
            text: 'Average Execution Time by Query Type',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time',
            tickangle: -45,
            tickfont: { size: 10 },
            side: 'bottom',
            autorange: true,
            rangeslider: { visible: false }
        },
        yaxis: { 
            title: 'Query Type',
            tickfont: { size: 9 },
            automargin: false,
            tickmode: 'array',
            tickvals: queryNames.map((_, i) => i),
            ticktext: queryNames,
            autorange: true
        },
        margin: { 
            l: 180,  // Reduced left margin - shorter query names
            r: 120,  // Right margin for colorbar
            t: 60,   // Top margin for title
            b: 80    // Bottom margin for x-axis labels
        },
        height: 800,
        autosize: true
    };
    
    const avgConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'heatmap_avg',
            height: 700,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapAvg', [avgTrace], avgLayout, avgConfig).then(function(gd) {
        // Force a window resize event to trigger proper autoscale
        window.dispatchEvent(new Event('resize'));
        // Also update the plot to ensure it's properly scaled
        Plotly.Plots.resize(gd);
    });
    
    // P99 heatmap with custom text showing counts
    const p99Trace = {
        z: p99HeatmapData,
        x: sampledTimeLabels,
        y: queryNames,
        type: 'heatmap',
        colorscale: 'Oranges',
        showscale: true,
        zauto: true,  // Enable auto-scale by default
        colorbar: {
            title: 'P99 Time (ms)',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>P99 Time: %{z:.2f}ms<br>Count: %{text}<extra></extra>',
        text: countData,
        texttemplate: '%{text}',
        textfont: {
            size: 8,
            color: 'black'
        }
    };
    
    const p99Layout = {
        title: {
            text: '99th Percentile Execution Time by Query Type',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time',
            tickangle: -45,
            tickfont: { size: 10 },
            side: 'bottom',
            autorange: true,
            rangeslider: { visible: false }
        },
        yaxis: { 
            title: 'Query Type',
            tickfont: { size: 9 },
            automargin: false,
            tickmode: 'array',
            tickvals: queryNames.map((_, i) => i),
            ticktext: queryNames,
            autorange: true
        },
        margin: { 
            l: 180,  // Reduced left margin - shorter query names
            r: 120,  // Right margin for colorbar
            t: 60,   // Top margin for title
            b: 80    // Bottom margin for x-axis labels
        },
        height: 700,
        autosize: true
    };
    
    const p99Config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'heatmap_p99',
            height: 700,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapP99', [p99Trace], p99Layout, p99Config).then(function(gd) {
        // Force a window resize event to trigger proper autoscale
        window.dispatchEvent(new Event('resize'));
        // Also update the plot to ensure it's properly scaled
        Plotly.Plots.resize(gd);
    });
    
    // Max heatmap with custom text showing counts
    const maxTrace = {
        z: maxHeatmapData,
        x: sampledTimeLabels,
        y: queryNames,
        type: 'heatmap',
        colorscale: 'Reds',
        showscale: true,
        zauto: true,  // Enable auto-scale by default
        colorbar: {
            title: 'Max Time (ms)',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>Max Time: %{z:.2f}ms<br>Count: %{text}<extra></extra>',
        text: countData,
        texttemplate: '%{text}',
        textfont: {
            size: 8,
            color: 'white'
        }
    };
    
    const maxLayout = {
        title: {
            text: 'Maximum Execution Time by Query Type',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time',
            tickangle: -45,
            tickfont: { size: 10 },
            side: 'bottom',
            autorange: true,
            rangeslider: { visible: false }
        },
        yaxis: { 
            title: 'Query Type',
            tickfont: { size: 9 },
            automargin: false,
            tickmode: 'array',
            tickvals: queryNames.map((_, i) => i),
            ticktext: queryNames,
            autorange: true
        },
        margin: { 
            l: 180,  // Reduced left margin - shorter query names
            r: 120,  // Right margin for colorbar
            t: 60,   // Top margin for title
            b: 80    // Bottom margin for x-axis labels
        },
        height: 800,
        autosize: true
    };
    
    const maxConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'heatmap_max',
            height: 700,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapMax', [maxTrace], maxLayout, maxConfig).then(function(gd) {
        // Force a window resize event to trigger proper autoscale
        window.dispatchEvent(new Event('resize'));
        // Also update the plot to ensure it's properly scaled
        Plotly.Plots.resize(gd);
    });
    
    // Query count heatmap
    const countTrace = {
        z: countData,
        x: sampledTimeLabels,
        y: queryNames,
        type: 'heatmap',
        colorscale: 'Blues',
        showscale: true,
        zauto: true,  // Enable auto-scale by default
        colorbar: {
            title: 'Query Count',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>Count: %{z}<extra></extra>',
        text: countData,
        texttemplate: '%{text}',
        textfont: {
            size: 10,
            color: function(value) {
                return value > 50 ? 'white' : 'black';
            }
        }
    };
    
    const countLayout = {
        title: {
            text: 'Query Count Distribution Over Time',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time',
            tickangle: -45,
            tickfont: { size: 10 },
            side: 'bottom',
            autorange: true,
            rangeslider: { visible: false }
        },
        yaxis: { 
            title: 'Query Type',
            tickfont: { size: 9 },
            automargin: false,
            tickmode: 'array',
            tickvals: queryNames.map((_, i) => i),
            ticktext: queryNames,
            autorange: true
        },
        margin: { 
            l: 180,  // Reduced left margin - shorter query names
            r: 120,  // Right margin for colorbar
            t: 60,   // Top margin for title
            b: 80    // Bottom margin for x-axis labels
        },
        height: 600,
        autosize: true
    };
    
    const countConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'heatmap_count',
            height: 600,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapCount', [countTrace], countLayout, countConfig).then(function(gd) {
        // Force a window resize event to trigger proper autoscale
        window.dispatchEvent(new Event('resize'));
        // Also update the plot to ensure it's properly scaled
        Plotly.Plots.resize(gd);
    });
    
    // Create P99 heatmap with partition closing events
    createP99WithPartitionClosings(p99HeatmapData, queryNames, sampledTimeLabels, sampledTimeData, countData);
    
    // Create Max heatmap with partition closing events
    createMaxWithPartitionClosings(maxHeatmapData, queryNames, sampledTimeLabels, sampledTimeData, countData);
}

// Slowest Queries Chart
export function createSlowestChart(topQueries) {
    const ctx = document.getElementById('slowestChart').getContext('2d');
    
    // Sort by average time and take top 10
    const slowestQueries = [...topQueries]
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10);
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: slowestQueries.map(q => q.query.substring(0, 30) + '...'),
            datasets: [{
                label: 'Average Execution Time (ms)',
                data: slowestQueries.map(q => q.avgTime),
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            animation: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const query = slowestQueries[context.dataIndex];
                            return [`Count: ${query.count}`, `Max: ${query.maxTime.toFixed(2)}ms`];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Average Execution Time (ms)'
                    }
                }
            }
        }
    });
    
    dataStore.setChart('slowest', chart);
    return chart;
}

// Re-export all additional chart functions from extensions
export {
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
};

// Chart management utility functions
export function destroyAllCharts() {
    dataStore.destroyAllCharts();
}

export function getChart(name) {
    return dataStore.getChart(name);
}

// Group by interval helper function export
export { groupByInterval };

// Default export for the ChartManager class
class ChartManager {
  constructor() {
    // Chart manager instance
  }
  
  // Re-export all chart functions as methods
  createTimelineChart = createTimelineChart;
  createFrequencyChart = createFrequencyChart;
  createHistogramChart = createHistogramChart;
  createBoxPlot = createBoxPlot;
  createHeatmaps = createHeatmaps;
  createSlowestChart = createSlowestChart;
  createP99WithPartitionClosings = createP99WithPartitionClosings;
  createMaxWithPartitionClosings = createMaxWithPartitionClosings;
  createErrorCharts = createErrorCharts;
  createConnectionErrorChart = createConnectionErrorChart;
  createErrorTypeChart = createErrorTypeChart;
  createErrorTable = createErrorTable;
  createWalCharts = createWalCharts;
  createWalAmplificationChart = createWalAmplificationChart;
  createWalAmplificationLogChart = createWalAmplificationLogChart;
  createWalRateChart = createWalRateChart;
  createWalCommitChart = createWalCommitChart;
  createWalTableChart = createWalTableChart;
  createWalTableMetrics = createWalTableMetrics;
  createPartitionClosingChart = createPartitionClosingChart;
  destroyAllCharts = destroyAllCharts;
  getChart = getChart;
}

export default ChartManager;