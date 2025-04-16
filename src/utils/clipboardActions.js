/**
 * Utility functions for clipboard operations
 */
import { getCellId, getCellIndices } from './cellHelpers'

/**
 * Copies the selected cells to the clipboard
 * @param {Array} selectedCells - Array of selected cell IDs
 * @param {Function} getCellData - Function to get cell data
 * @returns {Object} The copied cells data
 */
export function copyCells(selectedCells, getCellData) {
  if (!selectedCells || selectedCells.length === 0) return null
  
  // Sort selected cells by row and column for proper structure
  const sortedCells = [...selectedCells].sort((a, b) => {
    const [aCol, aRow] = getCellIndices(a)
    const [bCol, bRow] = getCellIndices(b)
    
    if (aRow === bRow) {
      return aCol - bCol
    }
    return aRow - bRow
  })
  
  // Create cells data object
  const copiedCells = {}
  
  for (const cellId of sortedCells) {
    copiedCells[cellId] = { ...getCellData(cellId) }
  }
  
  return {
    cells: copiedCells,
    range: sortedCells
  }
}

/**
 * Cuts selected cells (copy + clear)
 * @param {Array} selectedCells - Array of selected cell IDs
 * @param {Function} getCellData - Function to get cell data
 * @returns {Object} The cut cells data
 */
export function cutCells(selectedCells, getCellData) {
  return copyCells(selectedCells, getCellData)
}

/**
 * Pastes cells from clipboard to a target cell
 * @param {Object} clipboard - The clipboard data
 * @param {string} targetCellId - The target cell ID
 * @returns {Array} Updates to apply
 */
export function pasteCells(clipboard, targetCellId) {
  if (!clipboard || !clipboard.cells || !targetCellId) return []
  
  const { cells, range } = clipboard
  
  // Calculate offset
  const sourceStartId = range[0]
  const [sourceStartCol, sourceStartRow] = getCellIndices(sourceStartId)
  const [targetCol, targetRow] = getCellIndices(targetCellId)
  
  const colOffset = targetCol - sourceStartCol
  const rowOffset = targetRow - sourceStartRow
  
  // Create updates
  const updates = []
  
  for (const cellId of Object.keys(cells)) {
    const [col, row] = getCellIndices(cellId)
    const newCol = col + colOffset
    const newRow = row + rowOffset
    const newCellId = getCellId(newCol, newRow)
    
    updates.push({
      cellId: newCellId,
      value: cells[cellId].value,
      formula: cells[cellId].formula,
      formatting: {
        bold: cells[cellId].bold,
        italic: cells[cellId].italic,
        underline: cells[cellId].underline,
        align: cells[cellId].align,
        textColor: cells[cellId].textColor,
        bgColor: cells[cellId].bgColor
      }
    })
  }
  
  return updates
}

/**
 * Creates a tab-delimited text representation of cells for system clipboard
 * @param {Array} selectedCells - Array of selected cell IDs
 * @param {Function} getCellData - Function to get cell data
 * @returns {string} Tab-delimited text
 */
export function createClipboardText(selectedCells, getCellData) {
  if (!selectedCells || selectedCells.length === 0) return ''
  
  // Get the bounds of the selection
  let minRow = Infinity, maxRow = -Infinity
  let minCol = Infinity, maxCol = -Infinity
  
  for (const cellId of selectedCells) {
    const [col, row] = getCellIndices(cellId)
    minRow = Math.min(minRow, row)
    maxRow = Math.max(maxRow, row)
    minCol = Math.min(minCol, col)
    maxCol = Math.max(maxCol, col)
  }
  
  // Create a 2D array to hold the data
  const rowCount = maxRow - minRow + 1
  const colCount = maxCol - minCol + 1
  const grid = Array(rowCount).fill().map(() => Array(colCount).fill(''))
  
  // Fill in the data
  for (const cellId of selectedCells) {
    const [col, row] = getCellIndices(cellId)
    const relRow = row - minRow
    const relCol = col - minCol
    
    const cellData = getCellData(cellId)
    // Use display value without formatting
    grid[relRow][relCol] = cellData.formula || cellData.value || ''
  }
  
  // Convert to tab-delimited text
  return grid.map(row => row.join('\t')).join('\n')
}

/**
 * Parses tab-delimited text from system clipboard
 * @param {string} text - The tab-delimited text
 * @param {string} targetCellId - The target cell ID
 * @returns {Array} Updates to apply
 */
export function parseClipboardText(text, targetCellId) {
  if (!text || !targetCellId) return []
  
  // Parse the rows and columns
  const rows = text.split(/\r?\n/)
  const grid = rows.map(row => row.split('\t'))
  
  // Calculate target position
  const [targetCol, targetRow] = getCellIndices(targetCellId)
  
  // Create updates
  const updates = []
  
  for (let rowOffset = 0; rowOffset < grid.length; rowOffset++) {
    const row = grid[rowOffset]
    
    for (let colOffset = 0; colOffset < row.length; colOffset++) {
      const value = row[colOffset]
      
      if (value !== '') {
        const newCol = targetCol + colOffset
        const newRow = targetRow + rowOffset
        const newCellId = getCellId(newCol, newRow)
        
        // Check if it's a formula
        const isFormula = value.startsWith('=')
        
        updates.push({
          cellId: newCellId,
          value: isFormula ? '' : value,
          formula: isFormula ? value : ''
        })
      }
    }
  }
  
  return updates
}