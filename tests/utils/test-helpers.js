/**
 * Custom test utilities to reduce boilerplate and improve test quality
 */

import { screen, fireEvent, waitFor } from '@testing-library/dom';

/**
 * Create a test file with realistic content
 */
export function createTestLogFile(name = 'test.log', content = null) {
  const defaultContent = `
2025-01-01T12:00:00.000Z I i.q.g.e.QueryProgress fin [id=0x1234, sql=\`SELECT * FROM test_table\`, time=100000]
2025-01-01T12:00:01.000Z I i.q.c.w.ApplyWal2TableJob job finished [table=test_table, location=0x45, ampl=2.5]
2025-01-01T12:00:02.000Z I i.q.c.w.WalWriter commit [wal=/test_table~1/wal1/1, rowLo=0, rowHi=100]
  `.trim();
  
  return new File([content || defaultContent], name, { type: 'text/plain' });
}

/**
 * Set up realistic DOM structure for FileHandler tests
 */
export function setupFileHandlerDOM() {
  document.body.innerHTML = `
    <div class="container-fluid">
      <div id="uploadArea" class="upload-zone p-4 text-center border border-dashed">
        <h5>Upload QuestDB Log Files</h5>
        <p>Drop log files here or click to select</p>
      </div>
      <input type="file" id="fileInput" multiple accept=".log,.txt" style="display: none;" />
      
      <div id="progressContainer" class="mt-3" style="display: none;">
        <div class="d-flex justify-content-between">
          <span>Processing files...</span>
          <span id="progressText">0%</span>
        </div>
        <div class="progress">
          <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
        </div>
      </div>
      
      <div id="results" class="mt-3" style="display: none;">
        <h4>Analysis Results</h4>
        <div id="fileMetadata"></div>
      </div>
    </div>
  `;
}

/**
 * Set up chart testing DOM structure
 */
export function setupChartDOM() {
  document.body.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-6">
          <canvas id="timelineChart" width="400" height="300"></canvas>
        </div>
        <div class="col-md-6">
          <canvas id="frequencyChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div id="boxPlot"></div>
          <div id="heatmapAvg"></div>
        </div>
      </div>
      <div class="filters">
        <select id="tableFilter">
          <option value="all">All Tables</option>
        </select>
      </div>
    </div>
  `;
}

/**
 * Simulate file drop with realistic event data
 */
export async function simulateFileDrop(element, files) {
  const dataTransfer = {
    files,
    types: ['Files'],
    getData: () => '',
    setData: () => {}
  };
  
  fireEvent.dragOver(element, { dataTransfer });
  fireEvent.drop(element, { dataTransfer });
}

/**
 * Wait for element to become visible
 */
export async function waitForVisible(element) {
  await waitFor(() => {
    expect(element).toBeVisible();
  });
}

/**
 * Wait for element to become hidden
 */
export async function waitForHidden(element) {
  await waitFor(() => {
    expect(element).not.toBeVisible();
  });
}

/**
 * Create mock dependencies for FileHandler
 */
export function createMockDependencies() {
  return {
    logParser: {
      parseQuestDBLog: jest.fn(() => Promise.resolve({
        queries: [
          { 
            timestamp: new Date('2025-01-01T12:00:00Z'), 
            executionTimeMs: 100, 
            sqlPreview: 'SELECT * FROM test_table',
            table: 'test_table'
          }
        ],
        walJobs: [
          {
            timestamp: new Date('2025-01-01T12:00:01Z'),
            table: 'test_table',
            type: 'apply',
            amplification: 2.5
          }
        ],
        walCommits: [],
        partitionClosings: [],
        pgwireConnections: [],
        systemEvents: []
      }))
    },
    dataStore: {
      reset: jest.fn(),
      setQueryData: jest.fn(),
      setWalData: jest.fn(),
      setWalCommits: jest.fn(),
      setPartitionClosingData: jest.fn(),
      setPgwireConnectionData: jest.fn(),
      setErrorData: jest.fn(),
      addFileMetadata: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    }
  };
}

/**
 * Assert that progress is shown correctly
 */
export function expectProgressShown(percentage, message = null) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');
  
  expect(progressContainer).toBeVisible();
  expect(progressBar).toHaveStyle(`width: ${percentage}%`);
  expect(progressBar).toHaveAttribute('aria-valuenow', percentage.toString());
  
  if (message) {
    expect(progressText).toHaveTextContent(message);
  } else {
    expect(progressText).toHaveTextContent(`Processing: ${percentage}%`);
  }
}

/**
 * Assert that error alert is shown
 */
export function expectErrorAlert(message) {
  const errorAlert = document.getElementById('errorAlert');
  
  expect(errorAlert).toBeInTheDocument();
  expect(errorAlert).toHaveClass('alert', 'alert-danger');
  expect(errorAlert).toHaveAttribute('role', 'alert');
  expect(errorAlert).toHaveTextContent(message);
}