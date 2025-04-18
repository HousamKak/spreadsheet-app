// src/utils/dataValidator.js
/**
 * Utility functions for data validation in cells
 */

/**
 * Validation types
 */
export const ValidationType = {
    LIST: 'list',
    NUMBER: 'number',
    DATE: 'date',
    TIME: 'time',
    TEXT_LENGTH: 'textLength',
    CUSTOM: 'custom'
  };
  
  /**
   * Validation operators
   */
  export const ValidationOperator = {
    BETWEEN: 'between',
    NOT_BETWEEN: 'notBetween',
    EQUAL_TO: 'equalTo',
    NOT_EQUAL_TO: 'notEqualTo',
    GREATER_THAN: 'greaterThan',
    LESS_THAN: 'lessThan',
    GREATER_THAN_OR_EQUAL: 'greaterThanOrEqual',
    LESS_THAN_OR_EQUAL: 'lessThanOrEqual',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'notContains',
    BEGINS_WITH: 'beginsWith',
    ENDS_WITH: 'endsWith'
  };
  
  /**
   * Data validation rule interface
   * @typedef {Object} ValidationRule
   * @property {string} type - The validation type
   * @property {string} operator - The validation operator
   * @property {*} value1 - First validation value
   * @property {*} value2 - Second validation value (for BETWEEN)
   * @property {string} formula - Custom validation formula
   * @property {boolean} ignoreBlank - Whether to ignore blank values
   * @property {string} errorMessage - Custom error message
   */
  
  /**
   * Creates a data validation rule
   * @param {string} type - The validation type
   * @param {string} operator - The validation operator
   * @param {*} value1 - First validation value
   * @param {*} value2 - Second validation value (optional)
   * @param {Object} options - Additional options
   * @returns {ValidationRule} The validation rule
   */
  export function createValidationRule(type, operator, value1, value2 = null, options = {}) {
    return {
      type,
      operator,
      value1,
      value2,
      ignoreBlank: options.ignoreBlank ?? true,
      errorMessage: options.errorMessage || getDefaultErrorMessage(type, operator),
      formula: options.formula || null
    };
  }
  
  /**
   * Get the default error message for a validation type and operator
   * @param {string} type - The validation type
   * @param {string} operator - The validation operator
   * @returns {string} Default error message
   */
  function getDefaultErrorMessage(type, operator) {
    switch (type) {
      case ValidationType.LIST:
        return 'Please select a value from the list';
      
      case ValidationType.NUMBER:
        switch (operator) {
          case ValidationOperator.BETWEEN:
            return 'Please enter a number between the specified values';
          case ValidationOperator.NOT_BETWEEN:
            return 'Please enter a number not between the specified values';
          case ValidationOperator.EQUAL_TO:
            return 'Please enter a number equal to the specified value';
          case ValidationOperator.NOT_EQUAL_TO:
            return 'Please enter a number not equal to the specified value';
          case ValidationOperator.GREATER_THAN:
            return 'Please enter a number greater than the specified value';
          case ValidationOperator.LESS_THAN:
            return 'Please enter a number less than the specified value';
          case ValidationOperator.GREATER_THAN_OR_EQUAL:
            return 'Please enter a number greater than or equal to the specified value';
          case ValidationOperator.LESS_THAN_OR_EQUAL:
            return 'Please enter a number less than or equal to the specified value';
          default:
            return 'Please enter a valid number';
        }
      
      case ValidationType.DATE:
        return 'Please enter a valid date';
      
      case ValidationType.TIME:
        return 'Please enter a valid time';
        
      case ValidationType.TEXT_LENGTH:
        return 'Please enter text with a valid length';
        
      case ValidationType.CUSTOM:
        return 'Please enter a valid value';
      
      default:
        return 'Please enter a valid value';
    }
  }
  
  /**
   * Validates a value against a validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  export function validateValue(value, rule) {
    // Check for blank value
    if ((value === null || value === undefined || value === '') && rule.ignoreBlank) {
      return true;
    }
    
    switch (rule.type) {
      case ValidationType.LIST:
        return validateList(value, rule);
      
      case ValidationType.NUMBER:
        return validateNumber(value, rule);
      
      case ValidationType.DATE:
        return validateDate(value, rule);
      
      case ValidationType.TIME:
        return validateTime(value, rule);
      
      case ValidationType.TEXT_LENGTH:
        return validateTextLength(value, rule);
      
      case ValidationType.CUSTOM:
        return validateCustom(value, rule);
      
      default:
        return true;
    }
  }
  
  /**
   * Validates a value against a list validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateList(value, rule) {
    const list = Array.isArray(rule.value1) ? rule.value1 : String(rule.value1).split(',');
    
    // Normalize the list values and the input value for case-insensitive comparison
    const normalizedList = list.map(item => String(item).trim().toLowerCase());
    const normalizedValue = String(value).trim().toLowerCase();
    
    return normalizedList.includes(normalizedValue);
  }
  
  /**
   * Validates a value against a number validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateNumber(value, rule) {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return false;
    }
    
    const value1 = parseFloat(rule.value1);
    const value2 = rule.value2 !== null ? parseFloat(rule.value2) : null;
    
    switch (rule.operator) {
      case ValidationOperator.BETWEEN:
        return numValue >= value1 && numValue <= value2;
      
      case ValidationOperator.NOT_BETWEEN:
        return numValue < value1 || numValue > value2;
      
      case ValidationOperator.EQUAL_TO:
        return numValue === value1;
      
      case ValidationOperator.NOT_EQUAL_TO:
        return numValue !== value1;
      
      case ValidationOperator.GREATER_THAN:
        return numValue > value1;
      
      case ValidationOperator.LESS_THAN:
        return numValue < value1;
      
      case ValidationOperator.GREATER_THAN_OR_EQUAL:
        return numValue >= value1;
      
      case ValidationOperator.LESS_THAN_OR_EQUAL:
        return numValue <= value1;
      
      default:
        return true;
    }
  }
  
  /**
   * Validates a value against a date validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateDate(value, rule) {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return false;
    }
    
    const value1 = new Date(rule.value1);
    const value2 = rule.value2 !== null ? new Date(rule.value2) : null;
    
    // Check if dates are valid
    if (isNaN(value1.getTime()) || (value2 !== null && isNaN(value2.getTime()))) {
      return false;
    }
    
    switch (rule.operator) {
      case ValidationOperator.BETWEEN:
        return date >= value1 && date <= value2;
      
      case ValidationOperator.NOT_BETWEEN:
        return date < value1 || date > value2;
      
      case ValidationOperator.EQUAL_TO:
        return date.getTime() === value1.getTime();
      
      case ValidationOperator.NOT_EQUAL_TO:
        return date.getTime() !== value1.getTime();
      
      case ValidationOperator.GREATER_THAN:
        return date > value1;
      
      case ValidationOperator.LESS_THAN:
        return date < value1;
      
      case ValidationOperator.GREATER_THAN_OR_EQUAL:
        return date >= value1;
      
      case ValidationOperator.LESS_THAN_OR_EQUAL:
        return date <= value1;
      
      default:
        return true;
    }
  }
  
  /**
   * Validates a value against a time validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateTime(value, rule) {
    // Parse time strings (HH:MM:SS or HH:MM) to minutes since midnight
    const parseTime = (timeStr) => {
      const parts = timeStr.split(':').map(part => parseInt(part, 10));
      if (parts.length < 2 || parts.some(isNaN)) return NaN;
      
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts[2] || 0;
      
      return hours * 60 + minutes + seconds / 60;
    };
    
    const timeValue = parseTime(value);
    
    if (isNaN(timeValue)) {
      return false;
    }
    
    const value1 = parseTime(rule.value1);
    const value2 = rule.value2 !== null ? parseTime(rule.value2) : null;
    
    // Check if times are valid
    if (isNaN(value1) || (value2 !== null && isNaN(value2))) {
      return false;
    }
    
    switch (rule.operator) {
      case ValidationOperator.BETWEEN:
        return timeValue >= value1 && timeValue <= value2;
      
      case ValidationOperator.NOT_BETWEEN:
        return timeValue < value1 || timeValue > value2;
      
      case ValidationOperator.EQUAL_TO:
        return timeValue === value1;
      
      case ValidationOperator.NOT_EQUAL_TO:
        return timeValue !== value1;
      
      case ValidationOperator.GREATER_THAN:
        return timeValue > value1;
      
      case ValidationOperator.LESS_THAN:
        return timeValue < value1;
      
      case ValidationOperator.GREATER_THAN_OR_EQUAL:
        return timeValue >= value1;
      
      case ValidationOperator.LESS_THAN_OR_EQUAL:
        return timeValue <= value1;
      
      default:
        return true;
    }
  }
  
  /**
   * Validates a value against a text length validation rule
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateTextLength(value, rule) {
    const textLength = String(value).length;
    const value1 = parseInt(rule.value1, 10);
    const value2 = rule.value2 !== null ? parseInt(rule.value2, 10) : null;
    
    if (isNaN(value1) || (value2 !== null && isNaN(value2))) {
      return false;
    }
    
    switch (rule.operator) {
      case ValidationOperator.BETWEEN:
        return textLength >= value1 && textLength <= value2;
      
      case ValidationOperator.NOT_BETWEEN:
        return textLength < value1 || textLength > value2;
      
      case ValidationOperator.EQUAL_TO:
        return textLength === value1;
      
      case ValidationOperator.NOT_EQUAL_TO:
        return textLength !== value1;
      
      case ValidationOperator.GREATER_THAN:
        return textLength > value1;
      
      case ValidationOperator.LESS_THAN:
        return textLength < value1;
      
      case ValidationOperator.GREATER_THAN_OR_EQUAL:
        return textLength >= value1;
      
      case ValidationOperator.LESS_THAN_OR_EQUAL:
        return textLength <= value1;
      
      default:
        return true;
    }
  }
  
  /**
   * Validates a value against a custom validation formula
   * @param {*} value - The value to validate
   * @param {ValidationRule} rule - The validation rule
   * @returns {boolean} True if the value is valid
   */
  function validateCustom(value, rule) {
    if (!rule.formula) {
      return true;
    }
    
    try {
      // In a real implementation, this would evaluate the formula against the spreadsheet
      // For now, we'll simply return true as a placeholder
      return true;
    } catch (error) {
      console.error('Error evaluating custom validation formula:', error);
      return false;
    }
  }