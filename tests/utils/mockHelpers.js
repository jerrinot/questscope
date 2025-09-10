/**
 * Mock helpers for testing UI components
 */

// Mock Chart.js
export const createMockChart = () => {
  const mockChart = {
    destroy: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    resize: jest.fn(),
    data: {
      labels: [],
      datasets: []
    },
    options: {},
    config: {}
  };
  
  return mockChart;
};

export const mockChartJS = () => {
  const Chart = jest.fn().mockImplementation(() => createMockChart());
  Chart.register = jest.fn();
  
  global.Chart = Chart;
  window.Chart = Chart;
  
  return Chart;
};

// Mock Plotly.js
export const createMockPlotly = () => {
  const Plotly = {
    newPlot: jest.fn().mockResolvedValue({}),
    redraw: jest.fn().mockResolvedValue({}),
    Plots: {
      resize: jest.fn().mockResolvedValue({})
    },
    react: jest.fn().mockResolvedValue({})
  };
  
  global.Plotly = Plotly;
  window.Plotly = Plotly;
  
  return Plotly;
};

// Mock DOM elements
export const createMockCanvas = () => {
  const canvas = {
    getContext: jest.fn().mockReturnValue({
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      canvas: {
        width: 400,
        height: 200
      }
    }),
    width: 400,
    height: 200,
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  
  return canvas;
};

export const createMockElement = (tagName = 'div', id = null) => {
  const element = {
    tagName: tagName.toUpperCase(),
    id: id || '',
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    children: [],
    parentNode: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    getAttribute: jest.fn(),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    click: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn()
  };
  
  if (tagName === 'canvas') {
    Object.assign(element, createMockCanvas());
  }
  
  if (tagName === 'select') {
    element.value = '';
    element.options = [];
    element.selectedIndex = -1;
  }
  
  if (tagName === 'input') {
    element.value = '';
    element.files = [];
    element.type = 'text';
  }
  
  return element;
};

// Mock document methods
export const mockDocumentMethods = () => {
  const elements = new Map();
  
  const getElementById = jest.fn((id) => {
    if (!elements.has(id)) {
      elements.set(id, createMockElement('div', id));
    }
    return elements.get(id);
  });
  
  const querySelector = jest.fn((selector) => {
    // Simple mock that just returns a generic element
    return createMockElement('div');
  });
  
  const createElement = jest.fn((tagName) => {
    return createMockElement(tagName);
  });
  
  global.document.getElementById = getElementById;
  global.document.querySelector = querySelector;
  global.document.createElement = createElement;
  
  return {
    getElementById,
    querySelector,
    createElement,
    getElement: (id) => elements.get(id),
    setElement: (id, element) => elements.set(id, element)
  };
};

// Mock FileReader
export const mockFileReader = () => {
  const FileReader = jest.fn().mockImplementation(() => ({
    readAsText: jest.fn(function(file) {
      // Simulate async file reading
      setTimeout(() => {
        this.result = file.content || 'mock file content';
        if (this.onload) this.onload({ target: this });
      }, 0);
    }),
    onload: null,
    onerror: null,
    result: null
  }));
  
  global.FileReader = FileReader;
  return FileReader;
};

// Mock File and FileList
export const mockFileAPIs = () => {
  const File = jest.fn().mockImplementation((parts, name, options) => ({
    name,
    size: parts.join('').length,
    type: options?.type || 'text/plain',
    lastModified: Date.now(),
    content: parts.join('') // Custom property for testing
  }));
  
  global.File = File;
  return { File };
};

// Mock window methods
export const mockWindowMethods = () => {
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  const dispatchEvent = jest.fn();
  
  Object.defineProperty(window, 'addEventListener', { value: addEventListener, writable: true });
  Object.defineProperty(window, 'removeEventListener', { value: removeEventListener, writable: true });
  Object.defineProperty(window, 'dispatchEvent', { value: dispatchEvent, writable: true });
  
  return {
    addEventListener,
    removeEventListener,
    dispatchEvent
  };
};

// Setup all mocks for testing
export const setupAllMocks = () => {
  const chartJS = mockChartJS();
  const plotly = createMockPlotly();
  const documentMocks = mockDocumentMethods();
  const fileReader = mockFileReader();
  const fileAPIs = mockFileAPIs();
  const windowMocks = mockWindowMethods();
  
  return {
    chartJS,
    plotly,
    documentMocks,
    fileReader,
    fileAPIs,
    windowMocks
  };
};

// Cleanup mocks
export const cleanupMocks = () => {
  delete global.Chart;
  delete global.Plotly;
  delete global.FileReader;
  delete global.File;
  delete window.Chart;
  delete window.Plotly;
  
  jest.restoreAllMocks();
};

// Helper to create mock drag and drop events
export const createMockDragEvent = (type, files = []) => {
  const event = {
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: {
      files,
      dropEffect: 'copy',
      effectAllowed: 'all'
    },
    target: createMockElement('div')
  };
  
  return event;
};

// Helper to create mock form events
export const createMockFormEvent = (type, target = null, value = '') => {
  const event = {
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: target || { ...createMockElement('input'), value }
  };
  
  return event;
};