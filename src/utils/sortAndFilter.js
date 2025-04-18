// src/utils/sortAndFilter.js
import { getCellId, getCellIndices } from './cellHelpers';

/**
 * Utility functions for sorting and filtering data in the spreadsheet
 */

/**
 * Sort types
 */
export const SortType = {
  ASCENDING: 'asc',
  DESCENDING: 'desc'
};

/**
 * Filter types
 */
export const FilterType = {
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  BETWEEN: 'between',
  EMPTY: 'empty',
  NOT_EMPTY: 'notEmpty'
};

/**
 * Sort a range of cells by a specific column
 * @param {Object} cells - The cells object from the sheet
 * @param {number} startCol - Starting column index
 * @param {number} startRow - Starting row index
 * @param {number} endCol - Ending column index
 * @param {number} endRow - Ending row index
 * @param {number} sortColIndex - The column index to sort by
 * @param {string} sortType - The sort type (asc or desc)
 * @returns {Object} Object with cell updates to apply
 */
export function sortRange(cells, startCol, startRow, endCol, endRow, sortColIndex, sortType = SortType.ASCENDING) {
  // Validate inputs
  if (!cells || sortColIndex < startCol || sortColIndex > endCol) {
    console.error('Invalid sort parameters');
    return { updates: [] };
  }

  try {
    // Extract the rows to sort
    const rows = [];
    for (let row = startRow; row <= endRow; row++) {
      const rowData = [];
      for (let col = startCol; col <= endCol; col++) {
        const cellId = getCellId(col, row);
        rowData.push({
          col,
          cellId,
          value: cells[cellId]?.value || '',
          formula: cells[cellId]?.formula || '',
          formatting: cells[cellId] ? { ...cells[cellId] } : {}
        });
      }
      rows.push(rowData);
    }

    // Sort the rows based on the values in the sort column
    rows.sort((rowA, rowB) => {
      const valueA = getCellSortValue(rowA[sortColIndex - startCol].value);
      const valueB = getCellSortValue(rowB[sortColIndex - startCol].value);

      if (valueA === valueB) return 0;

      if (sortType === SortType.ASCENDING) {
        return valueA < valueB ? -1 : 1;
      } else {
        return valueA > valueB ? -1 : 1;
      }
    });

    // Create updates for the sorted rows
    const updates = [];
    rows.forEach((rowData, rowIndex) => {
      const targetRow = startRow + rowIndex;
      rowData.forEach((cell) => {
        const targetCol = cell.col;
        const targetCellId = getCellId(targetCol, targetRow);
        
        // Only update if different from original position
        if (targetCellId !== cell.cellId) {
          updates.push({
            cellId: targetCellId,
            value: cell.value,
            formula: cell.formula,
            formatting: { ...cell.formatting }
          });
        }
      });
    });

    return { updates };
  } catch (error) {
    console.error('Error sorting range:', error);
    return { updates: [] };
  }
}

/**
 * Sort a column with its related data
 * @param {Object} cells - The cells object from the sheet
 * @param {number} colIndex - The column index to sort
 * @param {number} startRow - Starting row index
 * @param {number} endRow - Ending row index
 * @param {Array} relatedCols - Array of related column indices to move with the sorted column
 * @param {string} sortType - The sort type (asc or desc)
 * @returns {Object} Object with cell updates to apply
 */
export function sortColumn(cells, colIndex, startRow, endRow, relatedCols = [], sortType = SortType.ASCENDING) {
  // Combine the column to sort with all related columns
  const allCols = [colIndex, ...relatedCols].filter((v, i, a) => a.indexOf(v) === i);
  
  // Find the min and max column indices
  const startCol = Math.min(...allCols);
  const endCol = Math.max(...allCols);
  
  // Sort the entire range by the specified column
  return sortRange(cells, startCol, startRow, endCol, endRow, colIndex, sortType);
}

/**
 * Get a normalized value for sorting
 * @param {*} value - The cell value
 * @returns {*} Normalized value for comparison
 */
function getCellSortValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Try to convert to number for numeric comparison
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }

  // Check if it's a date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  // Convert to lowercase string for case-insensitive comparison
  return String(value).toLowerCase();
}

/**
 * Apply a filter to a range of cells
 * @param {Object} cells - The cells object from the sheet
 * @param {number} startCol - Starting column index
 * @param {number} startRow - Starting row index
 * @param {number} endCol - Ending column index
 * @param {number} endRow - Ending row index
 * @param {number} filterColIndex - The column index to filter by
 * @param {string} filterType - The filter type
 * @param {*} filterValue - The filter value
 * @param {*} filterValue2 - The second filter value (for BETWEEN filter)
 * @returns {Array} Array of row indices that pass the filter
 */
export function filterRange(cells, startCol, startRow, endCol, endRow, filterColIndex, filterType, filterValue, filterValue2) {
  // Validate inputs
  if (!cells || filterColIndex < startCol || filterColIndex > endCol) {
    console.error('Invalid filter parameters');
    return [];
  }

  try {
    const matchingRows = [];

    // Check each row against the filter
    for (let row = startRow; row <= endRow; row++) {
      const cellId = getCellId(filterColIndex, row);
      const cellValue = cells[cellId]?.value || '';
      
      if (matchesFilter(cellValue, filterType, filterValue, filterValue2)) {
        matchingRows.push(row);
      }
    }

    return matchingRows;
  } catch (error) {
    console.error('Error filtering range:', error);
    return [];
  }
}

/**
 * Check if a value matches a filter
 * @param {*} value - The value to check
 * @param {string} filterType - The filter type
 * @param {*} filterValue - The filter value
 * @param {*} filterValue2 - The second filter value (for BETWEEN filter)
 * @returns {boolean} True if the value matches the filter
 */
function matchesFilter(value, filterType, filterValue, filterValue2) {
  // Handle empty values
  if (value === null || value === undefined || value === '') {
    if (filterType === FilterType.EMPTY) return true;
    if (filterType === FilterType.NOT_EMPTY) return false;
    return false;
  }

  // Non-empty checks
  if (filterType === FilterType.EMPTY) return false;
  if (filterType === FilterType.NOT_EMPTY) return true;

  // Try to normalize values for comparison
  const normalizedValue = normalizeCellValue(value);
  const normalizedFilterValue = normalizeCellValue(filterValue);
  const normalizedFilterValue2 = filterValue2 !== undefined ? normalizeCellValue(filterValue2) : undefined;

  // Apply filter based on type
  switch (filterType) {
    case FilterType.EQUALS:
      return normalizedValue === normalizedFilterValue;
    
    case FilterType.NOT_EQUALS:
      return normalizedValue !== normalizedFilterValue;
    
    case FilterType.GREATER_THAN:
      return normalizedValue > normalizedFilterValue;
    
    case FilterType.LESS_THAN:
      return normalizedValue < normalizedFilterValue;
    
    case FilterType.CONTAINS:
      return String(normalizedValue).toLowerCase().includes(String(normalizedFilterValue).toLowerCase());
    
    case FilterType.STARTS_WITH:
      return String(normalizedValue).toLowerCase().startsWith(String(normalizedFilterValue).toLowerCase());
    
    case FilterType.ENDS_WITH:
      return String(normalizedValue).toLowerCase().endsWith(String(normalizedFilterValue).toLowerCase());
    
    case FilterType.BETWEEN:
      return normalizedValue >= normalizedFilterValue && normalizedValue <= normalizedFilterValue2;
    
    default:
      return false;
  }
}

/**
 * Normalize a value for comparison
 * @param {*} value - The value to normalize
 * @returns {*} Normalized value
 */
function normalizeCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Try to convert to number
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }

  // Check if it's a date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  // Default to string
  return String(value).toLowerCase();
}

/**
 * Get all unique values in a column for creating filters
 * @param {Object} cells - The cells object from the sheet
 * @param {number} colIndex - The column index
 * @param {number} startRow - Starting row index 
 * @param {number} endRow - Ending row index
 * @returns {Array} Array of unique values
 */
export function getUniqueValuesInColumn(cells, colIndex, startRow, endRow) {
  const uniqueValues = new Set();
  
  for (let row = startRow; row <= endRow; row++) {
    const cellId = getCellId(colIndex, row);
    const cellValue = cells[cellId]?.value;
    
    if (cellValue !== undefined && cellValue !== null) {
      uniqueValues.add(cellValue);
    }
  }
  
  return Array.from(uniqueValues).sort((a, b) => {
    const valueA = normalizeCellValue(a);
    const valueB = normalizeCellValue(b);
    
    if (valueA === valueB) return 0;
    return valueA < valueB ? -1 : 1;
  });
}

/**
 * Search for text in a range of cells
 * @param {Object} cells - The cells object from the sheet 
 * @param {number} startCol - Starting column index
 * @param {number} startRow - Starting row index
 * @param {number} endCol - Ending column index
 * @param {number} endRow - Ending row index
 * @param {string} searchText - The text to search for
 * @param {boolean} matchCase - Whether to match case
 * @returns {Array} Array of matching cell IDs
 */
export function searchInRange(cells, startCol, startRow, endCol, endRow, searchText, matchCase = false) {
  const matches = [];
  
  if (!searchText) return matches;
  
  const searchPattern = matchCase ? searchText : searchText.toLowerCase();
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cellId = getCellId(col, row);
      const cellValue = cells[cellId]?.value;
      
      if (cellValue !== undefined && cellValue !== null) {
        const valueToCheck = matchCase ? String(cellValue) : String(cellValue).toLowerCase();
        
        if (valueToCheck.includes(searchPattern)) {
          matches.push(cellId);
        }
      }
    }
  }
  
  return matches;
}

/**
 * Replace text in a range of cells
 * @param {Object} cells - The cells object from the sheet
 * @param {number} startCol - Starting column index
 * @param {number} startRow - Starting row index
 * @param {number} endCol - Ending column index
 * @param {number} endRow - Ending row index
 * @param {string} searchText - The text to search for
 * @param {string} replaceText - The text to replace with
 * @param {boolean} matchCase - Whether to match case
 * @returns {Array} Array of updates to apply
 */
export function replaceInRange(cells, startCol, startRow, endCol, endRow, searchText, replaceText, matchCase = false) {
  const updates = [];
  
  if (!searchText) return updates;
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cellId = getCellId(col, row);
      const cellData = cells[cellId];
      
      if (cellData?.value !== undefined && cellData?.value !== null) {
        let cellValue = String(cellData.value);
        let newValue;
        
        if (matchCase) {
          if (cellValue.includes(searchText)) {
            newValue = cellValue.split(searchText).join(replaceText);
          }
        } else {
          const regex = new RegExp(escapeRegExp(searchText), 'gi');
          if (regex.test(cellValue)) {
            newValue = cellValue.replace(regex, replaceText);
          }
        }
        
        if (newValue !== undefined) {
          updates.push({
            cellId,
            value: newValue,
            formula: cellData.formula || '',
          });
        }
      }
    }
  }
  
  return updates;
}

/**
 * Escape special characters in a string for use in a regular expression
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}