/**
 * Utility functions for working with cells
 */

/**
 * Converts a zero-based column index to an alphabetical column ID (A, B, C, ..., Z, AA, AB, ...)
 * @param {number} index - Zero-based column index
 * @returns {string} Column ID
 */
export function getColumnId(index) {
    let id = ''
    let temp = index + 1
    
    while (temp > 0) {
      const remainder = (temp - 1) % 26
      id = String.fromCharCode(65 + remainder) + id
      temp = Math.floor((temp - 1) / 26)
    }
    
    return id
  }
  
  /**
   * Converts alphabetical column ID to a zero-based column index
   * @param {string} id - Column ID (A, B, C, ..., Z, AA, AB, ...)
   * @returns {number} Zero-based column index
   */
  export function getColumnIndex(id) {
    let index = 0
    for (let i = 0; i < id.length; i++) {
      index = index * 26 + (id.charCodeAt(i) - 64)
    }
    return index - 1
  }
  
  /**
   * Creates a cell ID from column and row indices
   * @param {number} colIndex - Zero-based column index
   * @param {number} rowIndex - Zero-based row index
   * @returns {string} Cell ID (e.g., A1, B2)
   */
  export function getCellId(colIndex, rowIndex) {
    return `${getColumnId(colIndex)}${rowIndex + 1}`
  }
  
  /**
   * Extracts column and row indices from a cell ID
   * @param {string} cellId - Cell ID (e.g., A1, B2)
   * @returns {Array} [colIndex, rowIndex] as zero-based indices
   */
  export function getCellIndices(cellId) {
    const colMatch = cellId.match(/^([A-Z]+)/)[1]
    const rowMatch = cellId.match(/(\d+)$/)[1]
    
    return [getColumnIndex(colMatch), parseInt(rowMatch) - 1]
  }
  
  /**
   * Determines if a given cell is within a selection range
   * @param {number} col - Column index to check
   * @param {number} row - Row index to check
   * @param {Array} selectedCells - Array of selected cell IDs
   * @returns {boolean} True if the cell is selected
   */
  export function isCellSelected(col, row, selectedCells) {
    if (!selectedCells || selectedCells.length === 0) return false
    
    const cellId = getCellId(col, row)
    return selectedCells.includes(cellId)
  }
  
  /**
   * Calculates the range of cells between two points
   * @param {number} startCol - Starting column index
   * @param {number} startRow - Starting row index
   * @param {number} endCol - Ending column index
   * @param {number} endRow - Ending row index
   * @returns {Array} Array of cell IDs in the range
   */
  export function getCellRange(startCol, startRow, endCol, endRow) {
    // Ensure start is before end
    const minCol = Math.min(startCol, endCol)
    const maxCol = Math.max(startCol, endCol)
    const minRow = Math.min(startRow, endRow)
    const maxRow = Math.max(startRow, endRow)
    
    const range = []
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        range.push(getCellId(col, row))
      }
    }
    
    return range
  }
  
  /**
   * Gets formatting properties from a cell data object
   * @param {object} cellData - Cell data object
   * @returns {string} CSS class string
   */
  export function getCellFormatting(cellData) {
    if (!cellData) return ''
    
    const classes = []
    
    if (cellData.bold) classes.push('bold')
    if (cellData.italic) classes.push('italic')
    if (cellData.underline) classes.push('underline')
    
    if (cellData.align) {
      classes.push(`align-${cellData.align}`)
    }
    
    return classes.join(' ')
  }
  
  /**
   * Gets cell style from formatting properties
   * @param {object} cellData - Cell data object
   * @returns {object} Style object for React
   */
  export function getCellStyle(cellData) {
    if (!cellData) return {}
    
    const style = {}
    
    if (cellData.textColor) style.color = cellData.textColor
    if (cellData.bgColor) style.backgroundColor = cellData.bgColor
    
    return style
  }
  
  /**
   * Generates an array of column indices for the grid
   * @param {number} count - Number of columns
   * @returns {Array} Array of column indices
   */
  export function generateColumnIndices(count) {
    return Array.from({ length: count }, (_, i) => i)
  }
  
  /**
   * Generates an array of row indices for the grid
   * @param {number} count - Number of rows
   * @returns {Array} Array of row indices
   */
  export function generateRowIndices(count) {
    return Array.from({ length: count }, (_, i) => i)
  }
  
  /**
   * Converts row/column indices to an Excel-like reference (A1, B2, etc.)
   * @param {number} colIndex - Column index
   * @param {number} rowIndex - Row index
   * @returns {string} Cell reference
   */
  export function getCellReference(colIndex, rowIndex) {
    const colLetter = getColumnId(colIndex)
    const rowNumber = rowIndex + 1
    return `${colLetter}${rowNumber}`
  }