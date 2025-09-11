/**
 * Tests for pure utility functions - no mocking needed!
 */

import {
  calculateProgress,
  isValidLogFile,
  createErrorMessage,
  createFileMetadata,
  formatBytes
} from '../../../src/utils/FileUtils';

describe('FileUtils', () => {
  describe('calculateProgress', () => {
    it('should calculate correct percentage', () => {
      expect(calculateProgress(25, 100)).toBe(25);
      expect(calculateProgress(50, 200)).toBe(25);
      expect(calculateProgress(3, 7)).toBe(43); // rounds to nearest
    });

    it('should handle edge cases', () => {
      expect(calculateProgress(0, 100)).toBe(0);
      expect(calculateProgress(100, 100)).toBe(100);
      expect(calculateProgress(5, 0)).toBe(0); // division by zero
    });
  });

  describe('isValidLogFile', () => {
    it('should accept valid log files', () => {
      const logFile = new File(['content'], 'test.log', { type: 'text/plain' });
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      expect(isValidLogFile(logFile)).toBe(true);
      expect(isValidLogFile(txtFile)).toBe(true);
    });

    it('should reject invalid files', () => {
      const imageFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      expect(isValidLogFile(imageFile)).toBe(false);
      expect(isValidLogFile(pdfFile)).toBe(false);
    });

    it('should handle files with missing MIME type', () => {
      const logFileNoMime = new File(['content'], 'test.log', { type: '' });
      expect(isValidLogFile(logFileNoMime)).toBe(true);
    });
  });

  describe('createErrorMessage', () => {
    it('should format error messages correctly', () => {
      const error = new Error('Parse failed');
      const message = createErrorMessage('test.log', error);
      
      expect(message).toBe('Failed to process test.log: Parse failed');
    });
  });

  describe('createFileMetadata', () => {
    it('should create metadata object with defaults', () => {
      const file = new File(['content'], 'test.log', { type: 'text/plain' });
      
      const metadata = createFileMetadata(file);
      
      expect(metadata).toMatchObject({
        name: 'test.log',
        size: 7, // 'content'.length
        type: 'text/plain',
        processed: false,
        error: null
      });
      
      // Test that date properties are Date objects (actual values may vary in test environment)
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should create metadata with custom values', () => {
      const file = new File(['content'], 'test.log', { type: 'text/plain' });
      const error = new Error('Test error');
      
      const metadata = createFileMetadata(file, true, error);
      
      expect(metadata.processed).toBe(true);
      expect(metadata.error).toBe(error);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimals', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });
  });
});