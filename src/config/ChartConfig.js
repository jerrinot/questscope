/**
 * Chart configuration constants
 */

// Color palette for consistent chart coloring
export const COLOR_PALETTE = [
  'rgb(54, 162, 235)',   // Blue
  'rgb(255, 99, 132)',    // Red
  'rgb(75, 192, 192)',    // Teal
  'rgb(255, 206, 86)',    // Yellow
  'rgb(153, 102, 255)',   // Purple
  'rgb(255, 159, 64)',    // Orange
  'rgb(201, 203, 207)',   // Grey
  'rgb(46, 204, 113)',    // Green
  'rgb(241, 196, 15)',    // Gold
  'rgb(231, 76, 60)',     // Crimson
  'rgb(155, 89, 182)',    // Violet
  'rgb(52, 152, 219)'     // Sky Blue
];

// Get consistent color for a table name
export function getTableColor(tableName, index = 0) {
  // Use hash of table name for consistent coloring
  let hash = 0;
  for (let i = 0; i < tableName.length; i++) {
    hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[colorIndex];
}

// Format UTC time for display
export function formatUTCTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

// Common Chart.js options
export const COMMON_CHART_OPTIONS = {
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
          day: 'MMM dd',
          month: 'MMM yyyy'
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
      beginAtZero: true,
      title: {
        display: true,
        text: 'Execution Time (ms)'
      }
    }
  }
};