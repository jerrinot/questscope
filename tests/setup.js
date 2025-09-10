/**
 * Jest setup file for DOM testing
 */

// Mock Chart.js
const mockChart = {
  destroy: jest.fn(),
  update: jest.fn(),
  render: jest.fn(),
  resize: jest.fn(),
  data: { labels: [], datasets: [] },
  options: {},
  config: {}
};

global.Chart = jest.fn().mockImplementation(() => mockChart);
global.Chart.register = jest.fn();
window.Chart = global.Chart;

// Mock Plotly.js
global.Plotly = {
  newPlot: jest.fn().mockResolvedValue({}),
  redraw: jest.fn().mockResolvedValue({}),
  Plots: {
    resize: jest.fn().mockResolvedValue({})
  },
  react: jest.fn().mockResolvedValue({})
};
window.Plotly = global.Plotly;

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(function(file) {
    setTimeout(() => {
      this.result = file.content || 'mock file content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }),
  onload: null,
  onerror: null,
  result: null
}));

// Mock File API
global.File = jest.fn().mockImplementation((parts, name, options) => ({
  name,
  size: parts.join('').length,
  type: options?.type || 'text/plain',
  lastModified: Date.now(),
  content: parts.join('') // Custom property for testing
}));

// Polyfill DragEvent for jsdom
global.DragEvent = class DragEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.dataTransfer = eventInitDict.dataTransfer || {
      files: eventInitDict.files || [],
      getData: jest.fn(),
      setData: jest.fn()
    };
  }
};

// Enhanced canvas mock for better Chart.js compatibility
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((type) => {
  if (type === '2d') {
    return {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn()
      }),
      measureText: jest.fn().mockReturnValue({ width: 10 }),
      canvas: {
        width: 400,
        height: 200
      }
    };
  }
  return null;
});

// Mock element creation for better DOM testing
const originalCreateElement = document.createElement;
document.createElement = jest.fn().mockImplementation((tagName) => {
  const element = originalCreateElement.call(document, tagName);
  
  // Add missing properties that might be needed
  if (!element.style) {
    element.style = {};
  }
  
  // Add classList mock if missing
  if (!element.classList) {
    element.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    };
  }
  
  return element;
});

// Mock window.dispatchEvent
Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true
});

// Mock console methods to reduce test noise
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any warnings/errors that are expected in tests
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});