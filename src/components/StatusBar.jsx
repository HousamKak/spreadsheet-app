// src/components/StatusBar.jsx
import { useState, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { getCellIndices } from '../utils/cellHelpers'

/**
 * Status bar component that displays information about the current selection
 */
function StatusBar() {
  const { state, getCellValue, getActiveSheet } = useSpreadsheet()
  const [selectionInfo, setSelectionInfo] = useState({
    count: 0,
    sum: 0,
    average: 0,
    min: 0,
    max: 0,
    hasNumbers: false
  })
  
  // Update selection information when selected cells change
  useEffect(() => {
    if (!state.selectedCells || state.selectedCells.length === 0) {
      setSelectionInfo({
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        hasNumbers: false
      })
      return
    }
    
    // Calculate statistics for selected cells
    const values = []
    let sum = 0
    let min = Infinity
    let max = -Infinity
    let hasNumbers = false
    
    state.selectedCells.forEach(cellId => {
      const cellValue = getCellValue(cellId)
      const numValue = parseFloat(cellValue)
      
      if (!isNaN(numValue)) {
        values.push(numValue)
        sum += numValue
        min = Math.min(min, numValue)
        max = Math.max(max, numValue)
        hasNumbers = true
      }
    })
    
    setSelectionInfo({
      count: state.selectedCells.length,
      sum: sum,
      average: values.length > 0 ? sum / values.length : 0,
      min: hasNumbers ? min : 0,
      max: hasNumbers ? max : 0,
      hasNumbers
    })
  }, [state.selectedCells, getCellValue])
  
  // Get the active sheet and cell info
  const activeSheet = getActiveSheet()
  const cellInfoText = state.activeCell ? 
    getCellInfoText(state.activeCell, state.selectedCells.length) : 
    'No cell selected'
  
  // Get current mode
  const mode = state.isEditing ? 'Edit' : (state.selectedCells.length > 0 ? 'Select' : 'Ready')
  
  return (
    <div className="status-bar">
      <div className="status-bar-item status-bar-mode">
        {mode}
      </div>
      
      <div className="status-bar-item">
        {cellInfoText}
      </div>
      
      {selectionInfo.hasNumbers && (
        <>
          <div className="status-bar-item">
            Sum: {formatNumber(selectionInfo.sum)}
          </div>
          
          <div className="status-bar-item">
            Average: {formatNumber(selectionInfo.average)}
          </div>
          
          <div className="status-bar-item">
            Min: {formatNumber(selectionInfo.min)}
          </div>
          
          <div className="status-bar-item">
            Max: {formatNumber(selectionInfo.max)}
          </div>
        </>
      )}
      
      <div className="status-bar-item" style={{ marginLeft: 'auto' }}>
        Rows: {activeSheet.maxRow} | Cols: {activeSheet.maxCol}
      </div>
    </div>
  )
}

/**
 * Get a description of the current cell/selection
 */
function getCellInfoText(activeCell, selectionCount) {
  if (!activeCell) return ''
  
  const [col, row] = getCellIndices(activeCell)
  
  if (selectionCount <= 1) {
    return `Cell: ${activeCell} (Column ${col + 1}, Row ${row + 1})`
  } else {
    return `${selectionCount} cells selected`
  }
}

/**
 * Format a number for display
 */
function formatNumber(num) {
  // For integer values, display without decimals
  if (Number.isInteger(num)) {
    return num.toString()
  }
  
  // For floating point values, limit to 2 decimal places
  return num.toFixed(2)
}

export default StatusBar