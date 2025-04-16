/**
 * Utility functions for data import/export and persistence
 */
import { getCellId, getCellIndices, getColumnId } from './cellHelpers'

/**
 * Saves the current spreadsheet state to localStorage
 * @param {Object} state - The spreadsheet state
 */
export function saveToLocalStorage(state) {
  try {
    localStorage.setItem('spreadsheet-data', JSON.stringify(state))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

/**
 * Loads spreadsheet state from localStorage
 * @returns {Object|null} The saved state or null if none found
 */
export function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('spreadsheet-data')
    if (savedData) {
      return JSON.parse(savedData)
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return null
}

/**
 * Exports the current sheet to CSV format
 * @param {Object} sheet - Sheet data
 * @returns {string} CSV data
 */
export function exportToCsv(sheet) {
  if (!sheet || !sheet.cells) return ''
  
  // Find the bounds of the sheet
  let maxRow = 0
  let maxCol = 0
  
  Object.keys(sheet.cells).forEach(cellId => {
    const [col, row] = getCellIndices(cellId)
    maxRow = Math.max(maxRow, row)
    maxCol = Math.max(maxCol, col)
  })
  
  // Create CSV rows
  const rows = []
  
  // Add header row with column IDs
  const headerRow = []
  for (let col = 0; col <= maxCol; col++) {
    headerRow.push(getColumnId(col))
  }
  rows.push(headerRow.join(','))
  
  // Add data rows
  for (let row = 0; row <= maxRow; row++) {
    const csvRow = []
    
    for (let col = 0; col <= maxCol; col++) {
      const cellId = getCellId(col, row)
      const cell = sheet.cells[cellId]
      
      if (cell) {
        // Handle commas and quotes in cells properly
        let value = cell.value || ''
        
        // If value contains commas, quotes, or newlines, wrap in quotes
        if (/[,"\n\r]/.test(value)) {
          // Escape any quotes by doubling them
          value = value.replace(/"/g, '""')
          value = `"${value}"`
        }
        
        csvRow.push(value)
      } else {
        csvRow.push('')
      }
    }
    
    rows.push(csvRow.join(','))
  }
  
  return rows.join('\n')
}

/**
 * Imports CSV data into a sheet structure
 * @param {string} csvData - CSV data
 * @returns {Object} Sheet data
 */
export function importFromCsv(csvData) {
  if (!csvData) return null
  
  const rows = csvData.split(/\r?\n/)
  const cells = {}
  
  // Skip header row (it contains column IDs)
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (!row.trim()) continue
    
    // Parse CSV properly (handling quotes, etc.)
    const values = parseCSVRow(row)
    
    for (let colIndex = 0; colIndex < values.length; colIndex++) {
      const value = values[colIndex]
      
      if (value) {
        const cellId = getCellId(colIndex, rowIndex - 1)
        
        // Check if it's a formula
        if (value.startsWith('=')) {
          cells[cellId] = {
            formula: value,
            value: ''  // Will be calculated later
          }
        } else {
          cells[cellId] = {
            value: value
          }
        }
      }
    }
  }
  
  return {
    cells,
    columnWidths: {},
    rowHeights: {},
    maxRow: rows.length,
    maxCol: Math.max(...rows.map(row => parseCSVRow(row).length))
  }
}

/**
 * Parses a CSV row properly handling quoted cells
 * @param {string} row - CSV row
 * @returns {Array} Array of cell values
 */
function parseCSVRow(row) {
  const result = []
  let cell = ''
  let inQuotes = false
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        cell += '"'
        i++  // Skip the next quote
      } else {
        // Toggle quotes
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      result.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  
  // Add the last cell
  result.push(cell)
  
  return result
}

/**
 * Creates a download link for CSV data
 * @param {string} csvData - CSV data
 * @param {string} filename - Filename for download
 */
export function downloadCsv(csvData, filename) {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename || 'spreadsheet.csv')
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}