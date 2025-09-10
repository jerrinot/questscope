# QuestScope - QuestDB Log Analyzer

A comprehensive QuestDB log analyzer built as a single-page application with a modular, testable architecture.

## Features

- Parse and analyze QuestDB rolling log files
- Extract query performance metrics
- Visualize WAL (Write-Ahead Log) operations
- Track system events and partition operations
- Interactive charts and statistics

## Architecture

### Modular Design

The application has been refactored from a monolithic HTML file into testable modules:

```
src/
├── index.js              # Main entry point
├── index.html            # HTML template
├── parsers/
│   └── LogParser.js      # Log parsing logic
├── processors/
│   └── DataProcessor.js  # Data transformation & statistics
├── visualization/
│   └── ChartManager.js   # Chart creation (WIP)
├── handlers/
│   └── FileHandler.js    # File operations (WIP)
└── store/
    └── DataStore.js      # State management (WIP)
```

### Static Deployment

Despite the modular architecture, the application remains deployable as a static site on GitHub Pages:

1. **Development**: Use ES6 modules and Jest for testing
2. **Production**: Webpack bundles everything into static files
3. **Deployment**: Single `index.html` + `bundle.js` for GitHub Pages

## Development

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run build:gh-pages
```

### Testing

The modular architecture enables comprehensive testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm run test:coverage
```

Test files are located in `tests/` directory:
- Unit tests for parsers
- Unit tests for data processors
- Integration tests (coming soon)

### Building for Production

```bash
# Build static files to dist/
npm run build

# Build directly to root for GitHub Pages
npm run build:gh-pages
```

## Deployment

### GitHub Pages

1. Build the production bundle:
   ```bash
   npm run build:gh-pages
   ```

2. Commit the generated files:
   ```bash
   git add index.html bundle.js
   git commit -m "Deploy to GitHub Pages"
   git push
   ```

3. Enable GitHub Pages in repository settings

### CI/CD

The repository includes GitHub Actions workflow for:
- Running tests on pull requests
- Building production bundles
- Generating test coverage reports

## Usage

1. Open the deployed page or run locally with `npm run dev`
2. Drag and drop QuestDB log files onto the upload area
3. View generated statistics and charts
4. Filter by table names or time ranges

## Log Format Support

The analyzer recognizes these QuestDB log patterns:
- Query execution: `QueryProgress fin/exe`
- WAL operations: `ApplyWal2TableJob`, `WalWriter commit`
- Partition events: `o3 split partition`, `squashing partitions`
- System events: Connection limits, merge operations

## Benefits of Refactoring

- **Testability**: Each module can be tested independently
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized data processing
- **Extensibility**: Easy to add new parsers or visualizations
- **Static Deployment**: Still works as a simple static site

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT