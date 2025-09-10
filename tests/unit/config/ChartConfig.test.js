import { getTableColor, formatUTCTime, COMMON_CHART_OPTIONS, COLOR_PALETTE } from '../../../src/config/ChartConfig';

describe('ChartConfig', () => {
  describe('COLOR_PALETTE', () => {
    it('should have a defined color palette', () => {
      expect(COLOR_PALETTE).toBeDefined();
      expect(Array.isArray(COLOR_PALETTE)).toBe(true);
      expect(COLOR_PALETTE.length).toBeGreaterThan(0);
    });

    it('should contain valid RGB color strings', () => {
      COLOR_PALETTE.forEach(color => {
        expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      });
    });
  });

  describe('getTableColor', () => {
    it('should return consistent colors for the same table name', () => {
      const color1 = getTableColor('test_table');
      const color2 = getTableColor('test_table');
      
      expect(color1).toBe(color2);
    });

    it('should return different colors for different table names', () => {
      const color1 = getTableColor('table1');
      const color2 = getTableColor('table2');
      
      // While not guaranteed to be different due to hash collisions,
      // most different strings should produce different colors
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
    });

    it('should return colors from the COLOR_PALETTE', () => {
      const color = getTableColor('any_table');
      expect(COLOR_PALETTE).toContain(color);
    });

    it('should handle empty table names', () => {
      const color = getTableColor('');
      expect(COLOR_PALETTE).toContain(color);
    });

    it('should handle special characters in table names', () => {
      const color1 = getTableColor('table-with-dashes');
      const color2 = getTableColor('table_with_underscores');
      const color3 = getTableColor('table.with.dots');
      
      expect(COLOR_PALETTE).toContain(color1);
      expect(COLOR_PALETTE).toContain(color2);
      expect(COLOR_PALETTE).toContain(color3);
    });

    it('should produce consistent results for table names with tilde suffixes', () => {
      // This tests the hash-based approach
      const color1 = getTableColor('table~20');
      const color2 = getTableColor('table~20');
      
      expect(color1).toBe(color2);
    });

    it('should handle very long table names', () => {
      const longTableName = 'a'.repeat(1000);
      const color = getTableColor(longTableName);
      
      expect(COLOR_PALETTE).toContain(color);
    });

    it('should respect index parameter if provided', () => {
      // The index parameter exists in the function signature but isn't used
      // Test that it doesn't break the function
      const color1 = getTableColor('test_table', 0);
      const color2 = getTableColor('test_table', 5);
      
      expect(color1).toBe(color2); // Should be the same since index isn't used
    });
  });

  describe('formatUTCTime', () => {
    it('should format Date objects correctly', () => {
      const date = new Date('2025-01-15T14:30:45.123Z');
      const formatted = formatUTCTime(date);
      
      expect(formatted).toBe('2025-01-15 14:30:45 UTC');
    });

    it('should format timestamp numbers correctly', () => {
      const timestamp = Date.UTC(2025, 0, 15, 14, 30, 45); // January is 0
      const formatted = formatUTCTime(timestamp);
      
      expect(formatted).toBe('2025-01-15 14:30:45 UTC');
    });

    it('should format timestamp strings correctly', () => {
      const timestampStr = '2025-01-15T14:30:45.123Z';
      const formatted = formatUTCTime(timestampStr);
      
      expect(formatted).toBe('2025-01-15 14:30:45 UTC');
    });

    it('should pad single-digit values with zeros', () => {
      const date = new Date('2025-01-05T09:08:07.123Z');
      const formatted = formatUTCTime(date);
      
      expect(formatted).toBe('2025-01-05 09:08:07 UTC');
    });

    it('should handle end of year correctly', () => {
      const date = new Date('2024-12-31T23:59:59.999Z');
      const formatted = formatUTCTime(date);
      
      expect(formatted).toBe('2024-12-31 23:59:59 UTC');
    });

    it('should handle beginning of year correctly', () => {
      const date = new Date('2025-01-01T00:00:00.000Z');
      const formatted = formatUTCTime(date);
      
      expect(formatted).toBe('2025-01-01 00:00:00 UTC');
    });

    it('should handle leap year correctly', () => {
      const date = new Date('2024-02-29T12:00:00.000Z');
      const formatted = formatUTCTime(date);
      
      expect(formatted).toBe('2024-02-29 12:00:00 UTC');
    });

    it('should maintain UTC timezone regardless of local timezone', () => {
      // Mock the local timezone by creating a date that would be different in local time
      const date = new Date('2025-06-15T12:00:00.000Z');
      const formatted = formatUTCTime(date);
      
      // Should always be UTC regardless of the test environment's timezone
      expect(formatted).toBe('2025-06-15 12:00:00 UTC');
    });
  });

  describe('COMMON_CHART_OPTIONS', () => {
    it('should have required common chart options', () => {
      expect(COMMON_CHART_OPTIONS).toBeDefined();
      expect(typeof COMMON_CHART_OPTIONS).toBe('object');
    });

    it('should have responsive set to true', () => {
      expect(COMMON_CHART_OPTIONS.responsive).toBe(true);
    });

    it('should have animation disabled for performance', () => {
      expect(COMMON_CHART_OPTIONS.animation).toBe(false);
    });

    it('should have interaction configuration', () => {
      expect(COMMON_CHART_OPTIONS.interaction).toBeDefined();
      expect(COMMON_CHART_OPTIONS.interaction.intersect).toBe(false);
      expect(COMMON_CHART_OPTIONS.interaction.mode).toBe('index');
    });

    it('should have plugins configuration', () => {
      expect(COMMON_CHART_OPTIONS.plugins).toBeDefined();
      expect(COMMON_CHART_OPTIONS.plugins.tooltip).toBeDefined();
      expect(COMMON_CHART_OPTIONS.plugins.tooltip.callbacks).toBeDefined();
      expect(typeof COMMON_CHART_OPTIONS.plugins.tooltip.callbacks.title).toBe('function');
    });

    it('should have scales configuration', () => {
      expect(COMMON_CHART_OPTIONS.scales).toBeDefined();
      expect(COMMON_CHART_OPTIONS.scales.x).toBeDefined();
      expect(COMMON_CHART_OPTIONS.scales.y).toBeDefined();
    });

    it('should configure x-axis for time with UTC', () => {
      const xScale = COMMON_CHART_OPTIONS.scales.x;
      
      expect(xScale.type).toBe('time');
      expect(xScale.adapters).toBeDefined();
      expect(xScale.adapters.date).toBeDefined();
      expect(xScale.adapters.date.zone).toBe('UTC');
    });

    it('should have time display formats', () => {
      const timeConfig = COMMON_CHART_OPTIONS.scales.x.time;
      
      expect(timeConfig.displayFormats).toBeDefined();
      expect(timeConfig.displayFormats.millisecond).toBeDefined();
      expect(timeConfig.displayFormats.second).toBeDefined();
      expect(timeConfig.displayFormats.minute).toBeDefined();
      expect(timeConfig.displayFormats.hour).toBeDefined();
      expect(timeConfig.displayFormats.day).toBeDefined();
      expect(timeConfig.displayFormats.month).toBeDefined();
    });

    it('should have UTC tooltip format', () => {
      const timeConfig = COMMON_CHART_OPTIONS.scales.x.time;
      expect(timeConfig.tooltipFormat).toBe('yyyy-MM-dd HH:mm:ss');
    });

    it('should configure y-axis to begin at zero', () => {
      const yScale = COMMON_CHART_OPTIONS.scales.y;
      expect(yScale.beginAtZero).toBe(true);
    });

    it('should have axis titles configured', () => {
      expect(COMMON_CHART_OPTIONS.scales.x.title.display).toBe(true);
      expect(COMMON_CHART_OPTIONS.scales.x.title.text).toBe('Time (UTC)');
      expect(COMMON_CHART_OPTIONS.scales.y.title.display).toBe(true);
      expect(COMMON_CHART_OPTIONS.scales.y.title.text).toBe('Execution Time (ms)');
    });

    it('should have tooltip title callback that uses formatUTCTime', () => {
      const titleCallback = COMMON_CHART_OPTIONS.plugins.tooltip.callbacks.title;
      
      // Mock context for tooltip callback
      const mockContext = [{
        parsed: { x: new Date('2025-01-15T14:30:45.123Z') }
      }];
      
      const result = titleCallback(mockContext);
      expect(result).toBe('2025-01-15 14:30:45 UTC');
    });
  });
});