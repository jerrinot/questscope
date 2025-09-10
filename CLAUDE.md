# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository contains a comprehensive QuestDB log analyzer built as a single-page HTML application. The analyzer processes QuestDB rolling log files to extract and visualize query performance metrics, write amplification data, system events, and WAL (Write-Ahead Log) operations.

## Architecture

The codebase consists of a single HTML file (`questdb_analyzer.html`) that implements a complete log analysis application with:

### Core Components
- **Log Parser**: Multi-pattern regex engine that extracts different types of log entries
- **Data Processing**: JavaScript modules for statistical analysis and data transformation
- **Visualization Engine**: Chart.js and Plotly.js based interactive charts
- **File Management**: Drag-and-drop file upload with progress tracking

### Data Flow Architecture
1. **Log Ingestion**: Processes multiple QuestDB rolling log files simultaneously
2. **Pattern Extraction**: Uses specialized regex patterns to identify:
   - Query execution logs (`QueryProgress fin/exe`)
   - WAL apply jobs (`ApplyWal2TableJob job finished/ejected`)
   - WAL commit logs (`WalWriter commit`)
   - System events (`o3 split partition`, `squashing partitions`, connection limits)
3. **Data Transformation**: Converts timestamps, calculates metrics, groups by table
4. **Visualization**: Creates multiple interconnected chart views with consistent color coding

### Log Pattern Processing
The analyzer recognizes these QuestDB log patterns:
- **Query Performance**: `time=[nanoseconds]` → converted to milliseconds
- **WAL Amplification**: Extracts `ampl=` values for write amplification analysis
- **WAL Commits**: Calculates rows committed via `rowHi - rowLo`
- **Table Names**: Strips tilde suffixes (e.g., `mm_table~20` → `mm_table`)

## Key Features

### Multi-Tab Visualization Interface
- **Timeline**: Query execution time trends
- **Frequency**: Query rate over time  
- **Distribution**: Statistical distribution of execution times
- **Box Plot**: Performance quartiles with outlier detection
- **Heatmaps**: Execution time vs query type correlation
- **Slowest Queries**: Top performance bottlenecks
- **Events**: System events (partitioning, connection issues)
- **Write Amplification**: WAL performance metrics with linear and log scales

### Interactive Features
- **Color Coding**: Consistent table-based colors across all charts
- **Series Persistence**: Chart legend visibility maintained during table filtering
- **Table Filtering**: Per-table analysis across all visualizations
- **File Metadata**: Displays timestamp ranges and statistics for imported files

## Working with the Codebase

### File Structure
```
questdb_analyzer.html    # Complete single-file application
questdb-rolling.log.*    # Sample QuestDB log files
```

### Development Approach
The entire application is contained in one HTML file with embedded CSS and JavaScript. When making modifications:

1. **Pattern Updates**: Modify regex patterns in the `parseQuestDBLog()` function
2. **Chart Additions**: Add new canvas elements and corresponding chart creation functions
3. **Data Processing**: Update the parsing loop and data structure creation
4. **UI Changes**: Modify the Bootstrap-based HTML structure

### Time Display Requirements
**IMPORTANT**: All timestamps must be displayed in UTC format across the entire application:
- **Chart.js configurations**: Use `adapters: { date: { zone: 'UTC' } }` in all time-based scales
- **Display formats**: Use ISO string format (e.g., `timestamp.toISOString()`) for consistent UTC display
- **Tables and text**: Append "UTC" label when showing times to users
- **Tooltips**: Configure Chart.js tooltips with `tooltipFormat: 'yyyy-MM-dd HH:mm:ss'` for UTC display
- **Never use** `toLocaleString()` or `toLocaleTimeString()` for timestamps as they convert to local timezone

### Log File Format
QuestDB rolling logs contain structured entries with timestamps and key-value pairs:
```
2025-09-03T13:24:11.877189Z I i.q.g.e.QueryProgress fin [id=12345, sql=`SELECT...`, time=285890]
2025-09-03T13:24:22.148726Z I i.q.c.w.WalWriter commit [wal=/table~21/wal335/323, rowLo=80337, rowHi=80437]
```

### Chart Management
Charts are managed through a global `charts` object with destruction/recreation patterns for filtering. Each chart type has its own creation function and supports:
- Color-coded datasets by table name
- Interactive tooltips with contextual information  
- Responsive design for different screen sizes
- Animation-free rendering for performance

### Performance Considerations
- Large log files (100MB+) are processed with memory optimization
- Progress tracking for file processing operations
- Chart updates use destroy/recreate pattern to prevent memory leaks
- Table name normalization removes tilde suffixes consistently

## Testing with Sample Data

The repository includes sample QuestDB rolling log files. To test functionality:
1. Open `questdb_analyzer.html` in a web browser
2. Drag and drop the `questdb-rolling.log.*` files
3. Verify all chart tabs populate with data
4. Test table filtering functionality across different chart types