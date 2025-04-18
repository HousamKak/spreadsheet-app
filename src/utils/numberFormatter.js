// src/utils/numberFormatter.js
/**
 * Utility for formatting numbers in various formats
 */

/**
 * Available number formats
 */
export const NumberFormats = {
    GENERAL: 'general',
    NUMBER: 'number',
    CURRENCY: 'currency',
    ACCOUNTING: 'accounting',
    DATE: 'date',
    TIME: 'time',
    PERCENTAGE: 'percentage',
    FRACTION: 'fraction',
    SCIENTIFIC: 'scientific',
    TEXT: 'text',
  }
  
  /**
   * Format a value according to the specified format
   * @param {*} value - The value to format
   * @param {string} format - The format to apply
   * @param {Object} options - Additional formatting options
   * @returns {string} The formatted value
   */
  export function formatValue(value, format = NumberFormats.GENERAL, options = {}) {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return '';
    }
  
    // Default options
    const defaultOptions = {
      locale: 'en-US',
      currency: 'USD',
      decimals: 2,
      useGrouping: true,
    };
  
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
  
    try {
      switch (format) {
        case NumberFormats.GENERAL:
          return formatGeneral(value);
  
        case NumberFormats.NUMBER:
          return formatNumber(value, mergedOptions);
  
        case NumberFormats.CURRENCY:
          return formatCurrency(value, mergedOptions);
  
        case NumberFormats.ACCOUNTING:
          return formatAccounting(value, mergedOptions);
  
        case NumberFormats.PERCENTAGE:
          return formatPercentage(value, mergedOptions);
  
        case NumberFormats.SCIENTIFIC:
          return formatScientific(value, mergedOptions);
  
        case NumberFormats.FRACTION:
          return formatFraction(value);
  
        case NumberFormats.DATE:
          return formatDate(value, mergedOptions);
  
        case NumberFormats.TIME:
          return formatTime(value, mergedOptions);
  
        case NumberFormats.TEXT:
          return String(value);
  
        default:
          return String(value);
      }
    } catch (error) {
      console.error('Error formatting value:', error);
      return String(value);
    }
  }
  
  /**
   * Format a value in general format (auto-detect number or text)
   */
  function formatGeneral(value) {
    // If it's a number, format it normally
    if (!isNaN(value) && typeof value !== 'boolean') {
      const num = parseFloat(value);
      // Use toLocaleString for basic formatting
      return num.toString();
    }
    
    // Otherwise, return as string
    return String(value);
  }
  
  /**
   * Format a value as a number with the specified options
   */
  function formatNumber(value, options) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return num.toLocaleString(options.locale, {
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
      useGrouping: options.useGrouping,
    });
  }
  
  /**
   * Format a value as currency
   */
  function formatCurrency(value, options) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return num.toLocaleString(options.locale, {
      style: 'currency',
      currency: options.currency,
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    });
  }
  
  /**
   * Format a value in accounting format (negative numbers in parentheses)
   */
  function formatAccounting(value, options) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    if (num < 0) {
      // Format without the negative sign and add parentheses
      const formatted = Math.abs(num).toLocaleString(options.locale, {
        style: 'currency',
        currency: options.currency,
        minimumFractionDigits: options.decimals,
        maximumFractionDigits: options.decimals,
      });
      return `(${formatted})`;
    } else {
      // Format normally
      return num.toLocaleString(options.locale, {
        style: 'currency',
        currency: options.currency,
        minimumFractionDigits: options.decimals,
        maximumFractionDigits: options.decimals,
      });
    }
  }
  
  /**
   * Format a value as a percentage
   */
  function formatPercentage(value, options) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return num.toLocaleString(options.locale, {
      style: 'percent',
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    });
  }
  
  /**
   * Format a value in scientific notation
   */
  function formatScientific(value, options) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return num.toExponential(options.decimals);
  }
  
  /**
   * Format a value as a fraction (approximate)
   */
  function formatFraction(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    // Simple fraction approximation
    const tolerance = 1.0E-6;
    let h1 = 1;
    let h2 = 0;
    let k1 = 0;
    let k2 = 1;
    let b = num;
    
    do {
      const a = Math.floor(b);
      const aux = h1;
      h1 = a * h1 + h2;
      h2 = aux;
      aux = k1;
      k1 = a * k1 + k2;
      k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(num - h1 / k1) > num * tolerance);
    
    return `${h1}/${k1}`;
  }
  
  /**
   * Format a value as a date
   */
  function formatDate(value, options) {
    // Try to convert to a date
    let date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Excel-style date number (days since 1900-01-01)
      date = new Date(Date.UTC(1900, 0, 1 + value));
    } else {
      date = new Date(value);
    }
    
    if (isNaN(date.getTime())) return String(value);
    
    // Format based on options
    const dateFormat = options.dateFormat || 'short';
    
    return date.toLocaleDateString(options.locale, {
      dateStyle: dateFormat,
    });
  }
  
  /**
   * Format a value as a time
   */
  function formatTime(value, options) {
    // Try to convert to a date
    let date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Excel-style time (fraction of day)
      const totalMs = value * 24 * 60 * 60 * 1000;
      date = new Date(totalMs);
    } else {
      date = new Date(value);
    }
    
    if (isNaN(date.getTime())) return String(value);
    
    // Format based on options
    const timeFormat = options.timeFormat || 'short';
    
    return date.toLocaleTimeString(options.locale, {
      timeStyle: timeFormat,
    });
  }
  
  /**
   * Parse a string with a number format specification
   * @param {string} formatString - The format string (e.g., "#,##0.00")
   * @returns {Object} Format type and options
   */
  export function parseFormatString(formatString) {
    if (!formatString) {
      return { type: NumberFormats.GENERAL, options: {} };
    }
    
    // Standardize the format string
    const format = formatString.trim().toLowerCase();
    
    // Check for known patterns
    if (format === 'general' || format === '#') {
      return { type: NumberFormats.GENERAL, options: {} };
    }
    
    if (format.includes('$') || format.includes('¥') || format.includes('€') || format.includes('£')) {
      // Currency format
      const options = {
        decimals: (format.match(/\.0+/) || [''])[0].length - 1,
      };
      
      if (format.includes('(') && format.includes(')')) {
        return { type: NumberFormats.ACCOUNTING, options };
      } else {
        return { type: NumberFormats.CURRENCY, options };
      }
    }
    
    if (format.includes('%')) {
      // Percentage format
      const options = {
        decimals: (format.match(/\.0+/) || [''])[0].length - 1,
      };
      return { type: NumberFormats.PERCENTAGE, options };
    }
    
    if (format.match(/^0+$/)) {
      // Integer format
      return { type: NumberFormats.NUMBER, options: { decimals: 0 } };
    }
    
    if (format.match(/^0+\.0+$/)) {
      // Decimal format
      const decimals = (format.match(/\.0+/) || [''])[0].length - 1;
      return { type: NumberFormats.NUMBER, options: { decimals } };
    }
    
    if (format.match(/^#+\/#+$/)) {
      // Fraction format
      return { type: NumberFormats.FRACTION, options: {} };
    }
    
    if (format.match(/^0\.0+e\+0+$/i)) {
      // Scientific format
      const decimals = (format.match(/\.0+/) || [''])[0].length - 1;
      return { type: NumberFormats.SCIENTIFIC, options: { decimals } };
    }
    
    if (format.match(/d+\/m+\/y+|m+\/d+\/y+|y+\/m+\/d+/i)) {
      // Date format
      return { type: NumberFormats.DATE, options: {} };
    }
    
    if (format.match(/h+:m+:s+|h+:m+/i)) {
      // Time format
      return { type: NumberFormats.TIME, options: {} };
    }
    
    // Default to general format
    return { type: NumberFormats.GENERAL, options: {} };
  }