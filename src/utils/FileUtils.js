/**
 * Pure utility functions for file processing
 * Easy to test without mocking
 */

/**
 * Calculate file processing progress
 */
export function calculateProgress(current, total) {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Validate file type
 */
export function isValidLogFile(file) {
  const validExtensions = ['.log', '.txt'];
  const validMimeTypes = ['text/plain', 'text/log', 'application/octet-stream'];
  
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  const hasValidMimeType = validMimeTypes.includes(file.type) || file.type === '';
  
  return hasValidExtension || hasValidMimeType;
}

/**
 * Generate error message for file processing
 */
export function createErrorMessage(fileName, error) {
  return `Failed to process ${fileName}: ${error.message}`;
}

/**
 * Create file metadata object
 */
export function createFileMetadata(file, processed = false, error = null) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    processed,
    error,
    timestamp: new Date()
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}