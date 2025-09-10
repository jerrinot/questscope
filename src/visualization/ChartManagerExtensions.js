/**
 * ChartManager Extensions - Additional complex chart functions
 */

import dataStore from '../store/DataStore.js';
import { getTableColor, formatUTCTime } from '../config/ChartConfig.js';

// Additional complex chart functions extracted from the original implementation

// P99 with Partition Closings Chart (Plotly)
export function createP99WithPartitionClosings(p99HeatmapData, queryNames, sampledTimeLabels, sampledTimeData, countData) {
    // Get partition closing data from global scope
    const partitionClosingData = dataStore.getAllData().partitionClosings;
    
    // Aggregate partition closing events by time windows to match query heatmap
    const partitionClosingRow = [];
    
    if (partitionClosingData && partitionClosingData.length > 0) {
        // Calculate the actual time window duration based on sampling
        sampledTimeData.forEach((timePoint, index) => {
            const timeStart = new Date(timePoint.timestamp);
            
            // Calculate time window size based on actual sampling - if we have next sample, use that gap
            let timeWindowMs = 1000; // Default to 1 second
            if (index < sampledTimeData.length - 1) {
                timeWindowMs = sampledTimeData[index + 1].timestamp.getTime() - timeStart.getTime();
            }
            
            const timeEnd = new Date(timeStart.getTime() + timeWindowMs);
            
            // Count partition closings in this actual time window
            const closingsInWindow = partitionClosingData.filter(closing => {
                return closing.timestamp >= timeStart && closing.timestamp < timeEnd;
            });
            
            partitionClosingRow.push(closingsInWindow.length);
        });
    } else {
        // Fill with zeros if no partition closing data
        sampledTimeData.forEach(() => partitionClosingRow.push(0));
    }
    
    // Calculate appropriate scaling for partition closings to make them visible
    const maxP99Time = Math.max(...p99HeatmapData.flat().filter(v => v !== null && v > 0));
    const maxPartitionClosings = Math.max(...partitionClosingRow);
    
    // Scale partition closings to be in a similar range as P99 times for color visibility
    const scalingFactor = maxPartitionClosings > 0 ? (maxP99Time * 0.8) / maxPartitionClosings : 1;
    const scaledPartitionClosingRow = partitionClosingRow.map(count => count * scalingFactor);
    
    // Combine query data with scaled partition closings
    const combinedHeatmapData = [...p99HeatmapData, scaledPartitionClosingRow];
    const combinedQueryNames = [...queryNames, 'Partition Closings (scaled)'];
    const combinedCountData = [...countData, partitionClosingRow]; // Keep original counts for display
    
    // Create the combined heatmap trace
    const combinedTrace = {
        z: combinedHeatmapData,
        x: sampledTimeLabels,
        y: combinedQueryNames,
        type: 'heatmap',
        colorscale: 'Oranges',
        showscale: true,
        zauto: true,
        colorbar: {
            title: 'P99 Time (ms) / Scaled Closings',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>' + 
            '%{customdata}<extra></extra>',
        customdata: combinedHeatmapData.map((row, rowIndex) => {
            return row.map((value, colIndex) => {
                if (rowIndex === combinedQueryNames.length - 1) {
                    // Partition closings row - show original count, not scaled
                    const originalCount = combinedCountData[rowIndex][colIndex];
                    return `Closings: ${originalCount}`;
                } else {
                    // Query rows
                    const count = combinedCountData[rowIndex][colIndex];
                    return value !== null ? 
                        `P99 Time: ${value.toFixed(2)}ms<br>Query Count: ${count}` : 
                        'No data';
                }
            });
        }),
        text: combinedCountData.map((row, rowIndex) => {
            return row.map((value, colIndex) => {
                if (rowIndex === combinedQueryNames.length - 1) {
                    // Partition closings row - show original count
                    return value > 0 ? value : '';
                } else {
                    // Query rows - show query count
                    return value > 0 ? value : '';
                }
            });
        }),
        texttemplate: '%{text}',
        textfont: {
            size: 8,
            color: 'black'
        }
    };
    
    const combinedLayout = {
        title: {
            text: 'P99 Execution Time with Partition Closing Events',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time (UTC)',
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
            tickvals: combinedQueryNames.map((_, i) => i),
            ticktext: combinedQueryNames,
            autorange: true
        },
        margin: { 
            l: 200,
            r: 120,
            t: 60,
            b: 80
        },
        height: 800,
        autosize: true
    };
    
    const combinedConfig = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'heatmap_p99_with_partitions',
            height: 700,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapP99WithPartitions', [combinedTrace], combinedLayout, combinedConfig).then(function(gd) {
        window.dispatchEvent(new Event('resize'));
        Plotly.Plots.resize(gd);
    });
}

// Max with Partition Closings Chart (Plotly)
export function createMaxWithPartitionClosings(maxHeatmapData, queryNames, sampledTimeLabels, sampledTimeData, countData) {
    // Get partition closing data from global scope
    const partitionClosingData = dataStore.getAllData().partitionClosings;
    
    // Aggregate partition closing events by time windows to match query heatmap
    const partitionClosingRow = [];
    
    if (partitionClosingData && partitionClosingData.length > 0) {
        // Calculate the actual time window duration based on sampling
        sampledTimeData.forEach((timePoint, index) => {
            const timeStart = new Date(timePoint.timestamp);
            
            // Calculate time window size based on actual sampling - if we have next sample, use that gap
            let timeWindowMs = 1000; // Default to 1 second
            if (index < sampledTimeData.length - 1) {
                timeWindowMs = sampledTimeData[index + 1].timestamp.getTime() - timeStart.getTime();
            }
            
            const timeEnd = new Date(timeStart.getTime() + timeWindowMs);
            
            // Count partition closings in this actual time window
            const closingsInWindow = partitionClosingData.filter(closing => {
                return closing.timestamp >= timeStart && closing.timestamp < timeEnd;
            });
            
            partitionClosingRow.push(closingsInWindow.length);
        });
    } else {
        // Fill with zeros if no partition closing data
        sampledTimeData.forEach(() => partitionClosingRow.push(0));
    }
    
    // Calculate appropriate scaling for partition closings to make them visible
    const maxExecutionTime = Math.max(...maxHeatmapData.flat().filter(v => v !== null && v > 0));
    const maxPartitionClosings = Math.max(...partitionClosingRow);
    
    // Scale partition closings to be in a similar range as max execution times for color visibility
    const scalingFactor = maxPartitionClosings > 0 ? (maxExecutionTime * 0.8) / maxPartitionClosings : 1;
    const scaledPartitionClosingRow = partitionClosingRow.map(count => count * scalingFactor);
    
    // Combine query data with scaled partition closings
    const combinedHeatmapData = [...maxHeatmapData, scaledPartitionClosingRow];
    const combinedQueryNames = [...queryNames, 'Partition Closings (scaled)'];
    const combinedCountData = [...countData, partitionClosingRow]; // Keep original counts for display
    
    // Create the combined heatmap trace
    const combinedTrace = {
        z: combinedHeatmapData,
        x: sampledTimeLabels,
        y: combinedQueryNames,
        type: 'heatmap',
        colorscale: 'Reds', // Use Reds colorscale like the original Max heatmap
        showscale: true,
        zauto: true, // Let it auto-scale now that we've normalized the data
        colorbar: {
            title: 'Max Time (ms) / Scaled Closings',
            titleside: 'right',
            thickness: 20,
            len: 0.8
        },
        hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Time: %{x}<br>' + 
            '%{customdata}<extra></extra>',
        customdata: combinedHeatmapData.map((row, rowIndex) => {
            return row.map((value, colIndex) => {
                if (rowIndex === combinedQueryNames.length - 1) {
                    // Partition closings row - show original count, not scaled
                    const originalCount = combinedCountData[rowIndex][colIndex];
                    return `Closings: ${originalCount}`;
                } else {
                    // Query rows
                    const count = combinedCountData[rowIndex][colIndex];
                    return value !== null ? 
                        `Max Time: ${value.toFixed(2)}ms<br>Query Count: ${count}` : 
                        'No data';
                }
            });
        }),
        text: combinedCountData.map((row, rowIndex) => {
            return row.map((value, colIndex) => {
                if (rowIndex === combinedQueryNames.length - 1) {
                    // Partition closings row - show original count
                    return value > 0 ? value : '';
                } else {
                    // Query rows - no text overlay for counts
                    return '';
                }
            });
        }),
        texttemplate: '%{text}',
        textfont: {
            size: 8,
            color: 'white' // Use white text like the original Max heatmap
        }
    };
    
    const combinedLayout = {
        title: {
            text: 'Maximum Execution Time with Partition Closing Events',
            font: { size: 16 }
        },
        xaxis: { 
            title: 'Time (UTC)',
            tickangle: -45,
            showgrid: true,
            gridcolor: 'rgba(128,128,128,0.2)'
        },
        yaxis: { 
            title: 'Query Types & Events',
            showgrid: true,
            gridcolor: 'rgba(128,128,128,0.2)',
            // Highlight the partition closings row
            tickfont: { 
                size: 10
            }
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        font: { size: 12 },
        margin: {
            l: 200,  // More space for query names
            r: 80,
            t: 80,
            b: 120
        },
        annotations: [{
            text: 'Bottom row shows partition closing event counts in the same time windows',
            showarrow: false,
            xref: 'paper', yref: 'paper',
            x: 0.5, y: -0.15,
            xanchor: 'center', yanchor: 'top',
            font: { size: 11, color: 'gray' }
        }]
    };
    
    const combinedConfig = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'max_with_partition_closings',
            height: 800,
            width: 1400,
            scale: 1
        }
    };
    
    Plotly.newPlot('heatmapMaxWithPartitions', [combinedTrace], combinedLayout, combinedConfig).then(function(gd) {
        // Force a window resize event to trigger proper autoscale
        window.dispatchEvent(new Event('resize'));
        // Also update the plot to ensure it's properly scaled
        Plotly.Plots.resize(gd);
    });
}

// Error Charts
export function createErrorCharts(errors) {
    const errorsBySecond = {};
    const connectionLimitBySecond = {};
    
    errors.forEach(error => {
        const timestamp = new Date(error.timestamp);
        const second = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                               timestamp.getHours(), timestamp.getMinutes(), timestamp.getSeconds());
        const key = second.getTime();
        
        if (!errorsBySecond[key]) {
            errorsBySecond[key] = [];
        }
        errorsBySecond[key].push(error);
        
        if (error.message && error.message.includes('connection limit')) {
            if (!connectionLimitBySecond[key]) {
                connectionLimitBySecond[key] = 0;
            }
            connectionLimitBySecond[key]++;
        }
    });
    
    createConnectionErrorChart(connectionLimitBySecond, errors);
    createErrorTypeChart(errors);
    createErrorTable(errorsBySecond, errors);
}

// Connection Error Chart
export function createConnectionErrorChart(connectionLimitBySecond, errors) {
    const ctx = document.getElementById('connectionErrorChart').getContext('2d');
    
    const timeLabels = Object.keys(connectionLimitBySecond)
        .map(key => new Date(parseInt(key)))
        .sort((a, b) => a - b);
    
    const data = timeLabels.map(time => connectionLimitBySecond[time.getTime()] || 0);
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Connection Limit Errors per Second',
                data: data,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
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
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
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
                        text: 'Connection Errors per Second'
                    }
                }
            }
        }
    });
    
    dataStore.setChart('connectionError', chart);
    return chart;
}

// Error Type Chart
export function createErrorTypeChart(errors) {
    const ctx = document.getElementById('errorTypeChart').getContext('2d');
    
    // Group errors by type
    const errorTypeCounts = {};
    errors.forEach(error => {
        const type = error.errorType || 'Unknown';
        errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1;
    });
    
    const labels = Object.keys(errorTypeCounts);
    const data = Object.values(errorTypeCounts);
    const colors = labels.map((_, index) => getTableColor(`error_${index}`, index));
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.6', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            animation: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${percentage}% of total errors`;
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('errorType', chart);
    return chart;
}

// Error Table
export function createErrorTable(errorsBySecond, errors) {
    const errorTableBody = document.getElementById('errorTableBody');
    if (!errorTableBody) return;
    
    // Create aggregated error entries sorted by timestamp
    const aggregatedErrors = [];
    
    Object.entries(errorsBySecond).forEach(([timestamp, errorList]) => {
        // Group by error type and table within this second
        const grouped = {};
        
        errorList.forEach(error => {
            const key = `${error.errorType || 'Unknown'}_${error.table || 'N/A'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    timestamp: new Date(parseInt(timestamp)),
                    errorType: error.errorType || 'Unknown',
                    table: error.table || 'N/A',
                    count: 0,
                    messages: []
                };
            }
            grouped[key].count++;
            grouped[key].messages.push(error.message);
        });
        
        aggregatedErrors.push(...Object.values(grouped));
    });
    
    // Sort by timestamp (most recent first)
    aggregatedErrors.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit to latest 100 entries for performance
    const recentErrors = aggregatedErrors.slice(0, 100);
    
    // Clear existing rows
    errorTableBody.innerHTML = '';
    
    // Add rows
    recentErrors.forEach(error => {
        const row = document.createElement('tr');
        
        // Add hover effect for row
        row.className = 'error-table-row';
        row.style.cursor = 'pointer';
        
        row.innerHTML = `
            <td class="text-nowrap">
                <small>${formatUTCTime(error.timestamp)}</small>
            </td>
            <td>
                <span class="badge bg-warning text-dark">${error.errorType}</span>
            </td>
            <td>
                <small class="text-muted">${error.table}</small>
            </td>
            <td class="text-center">
                <span class="badge bg-primary rounded-pill">${error.count}</span>
            </td>
        `;
        
        // Add click handler to show details
        row.addEventListener('click', () => {
            showErrorDetails(error);
        });
        
        errorTableBody.appendChild(row);
    });
    
    // Add "Show more" button if there are more errors
    if (aggregatedErrors.length > 100) {
        const moreRow = document.createElement('tr');
        moreRow.innerHTML = `
            <td colspan="4" class="text-center">
                <button class="btn btn-sm btn-outline-secondary" onclick="showAllErrors()">
                    Show ${aggregatedErrors.length - 100} more errors...
                </button>
            </td>
        `;
        errorTableBody.appendChild(moreRow);
    }
}

// Helper function to show error details in a modal or alert
function showErrorDetails(error) {
    const details = `
Error Type: ${error.errorType}
Table: ${error.table}
Time: ${formatUTCTime(error.timestamp)}
Count: ${error.count}

Sample Messages:
${error.messages.slice(0, 3).map((msg, i) => `${i + 1}. ${msg.substring(0, 200)}...`).join('\n')}
    `;
    
    alert(details); // In a real implementation, this would be a proper modal
}

// WAL Charts
export function createWalCharts() {
    const walData = dataStore.getAllData().walJobs;
    const walCommits = dataStore.getAllData().walCommits;
    
    if (!walData || walData.length === 0) return;
    
    // Populate table filter
    populateWalTableFilter(walData);
    
    // Create charts with all data initially
    createWalAmplificationChart(walData);
    createWalAmplificationLogChart(walData);
    createWalRateChart(walData);
    createWalCommitChart([...walData, ...walCommits]);
    createWalTableChart(walData);
    createWalTableMetrics(walData);
}

// Helper function to populate WAL table filter
function populateWalTableFilter(walData) {
    const tableFilter = document.getElementById('walTableFilter');
    if (!tableFilter) return;
    
    // Get unique table names from WAL data
    const tableNames = new Set();
    walData.forEach(job => {
        if (job.table) {
            tableNames.add(job.table);
        }
    });
    
    // Clear existing options except "All Tables"
    tableFilter.innerHTML = '<option value="all">All Tables</option>';
    
    // Add table name options
    Array.from(tableNames).sort().forEach(tableName => {
        const option = document.createElement('option');
        option.value = tableName;
        option.textContent = tableName;
        tableFilter.appendChild(option);
    });
    
    // Add event listener for filter changes
    tableFilter.onchange = () => filterWalByTable();
}

// Filter WAL charts by table
function filterWalByTable() {
    const selectedTable = document.getElementById('walTableFilter').value;
    const allWalData = dataStore.getAllData().walJobs;
    const allCommitData = dataStore.getAllData().walCommits;
    
    // Filter WAL data based on selected table
    let filteredData = allWalData;
    let filteredCommitData = allCommitData;
    if (selectedTable !== 'all') {
        filteredData = allWalData.filter(job => job.table === selectedTable);
        filteredCommitData = allCommitData.filter(commit => commit.table === selectedTable);
    }
    
    // Recreate charts with filtered data
    createWalAmplificationChart(filteredData);
    createWalAmplificationLogChart(filteredData);
    createWalRateChart(filteredData);
    createWalCommitChart([...filteredData, ...filteredCommitData]);
    createWalTableChart(filteredData);
    createWalTableMetrics(filteredData);
}

// WAL Amplification Chart (Linear Scale)
export function createWalAmplificationChart(data) {
    const ctx = document.getElementById('walAmplificationChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('walAmplification')) {
        dataStore.getChart('walAmplification').destroy();
    }
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter only apply jobs for amplification chart
    const applyJobs = sortedData.filter(job => job.type === 'apply');
    
    // Group apply jobs by table for color coding
    const tableGroups = {};
    applyJobs.forEach(job => {
        if (!tableGroups[job.table]) {
            tableGroups[job.table] = [];
        }
        tableGroups[job.table].push(job);
    });
    
    // Create datasets for each table
    const datasets = [];
    let colorIndex = 0;
    Object.entries(tableGroups).forEach(([tableName, jobs]) => {
        const color = getTableColor(tableName, colorIndex);
        
        datasets.push({
            label: tableName,
            data: jobs.map(job => ({
                x: job.timestamp,
                y: job.amplification,
                job: job // Store job reference for tooltip
            })),
            borderColor: color,
            backgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6
        });
        
        colorIndex++;
    });
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
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
                        text: 'Amplification Factor'
                    },
                    beginAtZero: false
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Write Amplification Over Time'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        },
                        afterLabel: function(context) {
                            const job = context.raw.job;
                            return [
                                `Rows: ${job.rows.toLocaleString()}`,
                                `Rate: ${job.rate.toLocaleString()} rows/s`,
                                `Time: ${job.timeMs}ms`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('walAmplification', chart);
    return chart;
}

// WAL Amplification Chart (Logarithmic Scale)  
export function createWalAmplificationLogChart(data) {
    const ctx = document.getElementById('walAmplificationLogChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('walAmplificationLog')) {
        dataStore.getChart('walAmplificationLog').destroy();
    }
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter only apply jobs for amplification chart
    const applyJobs = sortedData.filter(job => job.type === 'apply');
    
    // Group apply jobs by table for color coding
    const tableGroups = {};
    applyJobs.forEach(job => {
        if (!tableGroups[job.table]) {
            tableGroups[job.table] = [];
        }
        tableGroups[job.table].push(job);
    });
    
    // Create datasets for each table
    const datasets = [];
    let colorIndex = 0;
    Object.entries(tableGroups).forEach(([tableName, jobs]) => {
        const color = getTableColor(tableName, colorIndex);
        
        datasets.push({
            label: tableName,
            data: jobs.map(job => ({
                x: job.timestamp,
                y: job.amplification,
                job: job // Store job reference for tooltip
            })),
            borderColor: color,
            backgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6
        });
        
        colorIndex++;
    });
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    }
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Amplification Factor (Log Scale)'
                    },
                    min: 0.1,
                    ticks: {
                        callback: function(value) {
                            if (value === 0.1 || value === 1 || value === 10 || value === 100 || value === 1000 || value === 10000) {
                                return value.toString();
                            }
                            return null;
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Write Amplification Over Time (Logarithmic Scale)'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        },
                        afterLabel: function(context) {
                            const job = context.raw.job;
                            return [
                                `Rows: ${job.rows.toLocaleString()}`,
                                `Rate: ${job.rate.toLocaleString()} rows/s`,
                                `Time: ${job.timeMs}ms`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('walAmplificationLog', chart);
    return chart;
}

// WAL Rate Chart
export function createWalRateChart(data) {
    const ctx = document.getElementById('walRateChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('walRate')) {
        dataStore.getChart('walRate').destroy();
    }
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter only apply jobs for rate chart
    const applyJobs = sortedData.filter(job => job.type === 'apply');
    
    // Group apply jobs by table for color coding
    const tableGroups = {};
    applyJobs.forEach(job => {
        if (!tableGroups[job.table]) {
            tableGroups[job.table] = [];
        }
        tableGroups[job.table].push(job);
    });
    
    // Create datasets for each table
    const datasets = [];
    let colorIndex = 0;
    Object.entries(tableGroups).forEach(([tableName, jobs]) => {
        const color = getTableColor(tableName, colorIndex);
        
        datasets.push({
            label: tableName,
            data: jobs.map(job => ({
                x: job.timestamp,
                y: job.rate,
                job: job // Store job reference for tooltip
            })),
            borderColor: color,
            backgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6
        });
        
        colorIndex++;
    });
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
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
                        text: 'Write Rate (rows/s)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Write Rate Over Time'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        },
                        afterLabel: function(context) {
                            const job = context.raw.job;
                            return [
                                `Rows: ${job.rows.toLocaleString()}`,
                                `Amplification: ${job.amplification.toFixed(2)}`,
                                `Time: ${job.timeMs}ms`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('walRate', chart);
    return chart;
}

// WAL Commit Chart
export function createWalCommitChart(data) {
    const ctx = document.getElementById('walCommitChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('walCommit')) {
        dataStore.getChart('walCommit').destroy();
    }
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter only commit data
    const commitData = sortedData.filter(job => job.type === 'commit');
    
    // Group commit data by table for color coding
    const tableGroups = {};
    commitData.forEach(commit => {
        if (!tableGroups[commit.table]) {
            tableGroups[commit.table] = [];
        }
        tableGroups[commit.table].push(commit);
    });
    
    // Create datasets for each table
    const datasets = [];
    let colorIndex = 0;
    Object.entries(tableGroups).forEach(([tableName, commits]) => {
        const color = getTableColor(tableName, colorIndex);
        
        datasets.push({
            label: tableName,
            data: commits.map(commit => ({
                x: commit.timestamp,
                y: commit.rows,
                commit: commit // Store commit reference for tooltip
            })),
            borderColor: color,
            backgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6
        });
        
        colorIndex++;
    });
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
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
                        text: 'Rows Committed'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'WAL Commit Rate Over Time'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return formatUTCTime(context[0].parsed.x);
                        },
                        afterLabel: function(context) {
                            const commit = context.raw.commit;
                            return [
                                `Table: ${commit.table}`,
                                `Rows: ${commit.rows.toLocaleString()}`
                            ];
                        }
                    }
                }
            }
        }
    });
    
    dataStore.setChart('walCommit', chart);
    return chart;
}

// WAL Table Bar Chart
export function createWalTableChart(data) {
    const ctx = document.getElementById('walTableChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('walTable')) {
        dataStore.getChart('walTable').destroy();
    }
    
    // Group data by table and calculate metrics
    const tableMetrics = {};
    data.forEach(job => {
        if (job.type !== 'apply') return; // Only use apply jobs for amplification metrics
        
        if (!tableMetrics[job.table]) {
            tableMetrics[job.table] = {
                amplifications: [],
                totalRows: 0,
                rates: [],
                count: 0
            };
        }
        tableMetrics[job.table].amplifications.push(job.amplification);
        tableMetrics[job.table].totalRows += job.rows;
        tableMetrics[job.table].rates.push(job.rate);
        tableMetrics[job.table].count++;
    });
    
    // Calculate averages and prepare chart data
    const tableNames = [];
    const avgAmplifications = [];
    
    Object.entries(tableMetrics).forEach(([table, metrics]) => {
        const avgAmpl = metrics.amplifications.reduce((a, b) => a + b, 0) / metrics.amplifications.length;
        
        tableNames.push(table);
        avgAmplifications.push(avgAmpl);
    });
    
    // Sort by average amplification
    const sortedIndices = avgAmplifications
        .map((val, idx) => ({ val, idx }))
        .sort((a, b) => b.val - a.val)
        .map(item => item.idx);
    
    const sortedTableNames = sortedIndices.map(i => tableNames[i]);
    const sortedAmplifications = sortedIndices.map(i => avgAmplifications[i]);
    
    // Create bar chart for top 10 tables
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedTableNames.slice(0, 10),
            datasets: [{
                label: 'Average Amplification',
                data: sortedAmplifications.slice(0, 10),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Amplification Factor'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Tables by Average Amplification'
                }
            }
        }
    });
    
    dataStore.setChart('walTable', chart);
    return chart;
}

// WAL Table Metrics
export function createWalTableMetrics(data) {
    // Group data by table and calculate metrics
    const tableMetrics = {};
    data.forEach(job => {
        if (job.type !== 'apply') return; // Only use apply jobs for amplification metrics
        
        if (!tableMetrics[job.table]) {
            tableMetrics[job.table] = {
                amplifications: [],
                totalRows: 0,
                rates: [],
                count: 0
            };
        }
        tableMetrics[job.table].amplifications.push(job.amplification);
        tableMetrics[job.table].totalRows += job.rows;
        tableMetrics[job.table].rates.push(job.rate);
        tableMetrics[job.table].count++;
    });
    
    // Calculate averages
    const tableData = [];
    
    Object.entries(tableMetrics).forEach(([table, metrics]) => {
        const avgAmpl = metrics.amplifications.reduce((a, b) => a + b, 0) / metrics.amplifications.length;
        const avgRate = metrics.rates.reduce((a, b) => a + b, 0) / metrics.rates.length;
        
        tableData.push({
            table,
            avgAmplification: avgAmpl,
            totalRows: metrics.totalRows,
            avgRate: avgRate,
            count: metrics.count
        });
    });
    
    // Update metrics table
    updateWalMetricsTable(tableData);
}

// Helper function to update WAL metrics table
function updateWalMetricsTable(tableData) {
    const tbody = document.getElementById('walTableBody');
    if (!tbody) return;
    
    // Sort by average amplification
    tableData.sort((a, b) => b.avgAmplification - a.avgAmplification);
    
    // Generate HTML
    tbody.innerHTML = tableData.map(data => `
        <tr>
            <td><code>${data.table}</code></td>
            <td>${data.avgAmplification.toFixed(2)}</td>
            <td>${data.totalRows.toLocaleString()}</td>
            <td>${Math.round(data.avgRate).toLocaleString()}</td>
            <td>${data.count}</td>
        </tr>
    `).join('');
}

// Partition Closing Chart
export function createPartitionClosingChart() {
    const ctx = document.getElementById('partitionClosingChart');
    if (!ctx) return;
    
    // Get partition closing data from the data store
    const partitionClosingData = dataStore.getAllData().partitionClosings;
    
    if (!partitionClosingData || partitionClosingData.length === 0) {
        // Update stats div to show no data
        const statsDiv = document.getElementById('partitionClosingStats');
        if (statsDiv) {
            statsDiv.innerHTML = '<div class="alert alert-info">No partition closing events found in the log data.</div>';
        }
        return;
    }
    
    // Destroy existing chart if it exists
    if (dataStore.getChart('partitionClosing')) {
        dataStore.getChart('partitionClosing').destroy();
    }
    
    // Sort data by timestamp
    const sortedData = [...partitionClosingData].sort((a, b) => a.timestamp - b.timestamp);
    
    // Group partition closings by table for color coding
    const tableGroups = {};
    sortedData.forEach(closing => {
        if (!tableGroups[closing.table]) {
            tableGroups[closing.table] = [];
        }
        tableGroups[closing.table].push(closing);
    });
    
    // Create datasets for each table
    const datasets = [];
    let colorIndex = 0;
    Object.entries(tableGroups).forEach(([tableName, closings]) => {
        const color = getTableColor(tableName, colorIndex);
        
        datasets.push({
            label: tableName,
            data: closings.map((closing, index) => ({
                x: closing.timestamp,
                y: index + 1, // Simple y-axis positioning
                closing: closing // Store closing reference for tooltip
            })),
            borderColor: color,
            backgroundColor: color,
            pointRadius: 6,
            pointHoverRadius: 8,
            showLine: false // Show as scatter plot
        });
        
        colorIndex++;
    });
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            second: 'HH:mm:ss',
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        },
                        tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
                    },
                    adapters: {
                        date: {
                            zone: 'UTC'
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
                        text: 'Event Sequence'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dataPoint = context[0];
                            const closing = dataPoint.raw.closing;
                            return `Partition Closing - ${formatUTCTime(closing.timestamp)}`;
                        },
                        label: function(context) {
                            const closing = context.raw.closing;
                            return [
                                `Table: ${closing.table}`,
                                `Partition Timestamp: ${closing.partitionTimestamp}`,
                                `File: ${closing.file || 'Unknown'}`
                            ];
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
    
    // Store chart for later destruction
    dataStore.setChart('partitionClosing', chart);
    
    // Update partition closing statistics
    updatePartitionClosingStats(sortedData);
}

// Function to update partition closing statistics
function updatePartitionClosingStats(partitionClosings) {
    const statsDiv = document.getElementById('partitionClosingStats');
    if (!statsDiv || !partitionClosings || partitionClosings.length === 0) {
        return;
    }
    
    // Calculate statistics
    const totalClosings = partitionClosings.length;
    const tableStats = {};
    const timeRange = {
        earliest: new Date(Math.min(...partitionClosings.map(c => c.timestamp.getTime()))),
        latest: new Date(Math.max(...partitionClosings.map(c => c.timestamp.getTime())))
    };
    
    // Group by table for detailed stats
    partitionClosings.forEach(closing => {
        if (!tableStats[closing.table]) {
            tableStats[closing.table] = {
                count: 0,
                partitions: new Set()
            };
        }
        tableStats[closing.table].count++;
        tableStats[closing.table].partitions.add(closing.partitionTimestamp);
    });
    
    // Convert to array and sort by count
    const sortedTableStats = Object.entries(tableStats)
        .map(([table, stats]) => ({
            table,
            count: stats.count,
            uniquePartitions: stats.partitions.size
        }))
        .sort((a, b) => b.count - a.count);
    
    // Generate HTML
    statsDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">Summary</h6>
                        <p><strong>Total Partition Closings:</strong> ${totalClosings.toLocaleString()}</p>
                        <p><strong>Unique Tables:</strong> ${Object.keys(tableStats).length}</p>
                        <p><strong>Time Range:</strong> ${formatUTCTime(timeRange.earliest)} - ${formatUTCTime(timeRange.latest)}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">By Table</h6>
                        <div style="max-height: 200px; overflow-y: auto;">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Table</th>
                                        <th>Closings</th>
                                        <th>Unique Partitions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedTableStats.map(stats => `
                                        <tr>
                                            <td><code style="color: ${getTableColor(stats.table)}">${stats.table}</code></td>
                                            <td>${stats.count}</td>
                                            <td>${stats.uniquePartitions}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}