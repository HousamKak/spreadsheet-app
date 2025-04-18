// src/hooks/useSpreadsheetOperations.js
import { useCallback, useEffect, useState } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { FormulaParser } from '../utils/FormulaParser'
import { formatValue, NumberFormats } from '../utils/numberFormatter'
import { copyCells, cutCells, pasteCells, parseClipboardText } from '../utils/clipboardActions'
import { saveToLocalStorage, loadFromLocalStorage, exportToCsv, downloadCsv, importFromCsv } from '../utils/dataHelpers'
import { sortRange, sortColumn, SortType, filterRange, FilterType } from '../utils/sortAndFilter'
import { getCellIndices, getCellId } from '../utils/cellHelpers'

/**
 * Enhanced custom hook for spreadsheet operations
 * @returns {Object} Object containing spreadsheet operations
 */
function useSpreadsheetOperations() {
  const { state, dispatch, ActionTypes, getCellValue, getCellData, getActiveSheet } = useSpreadsheet()
  const [formulaParser, setFormulaParser] = useState(null)
  const [dependencies, setDependencies] = useState({})
  
  // Initialize the enhanced formula parser
  useEffect(() => {
    setFormulaParser(new FormulaParser(getCellValue))
  }, [getCellValue])
  
  // Save to localStorage when state changes
  useEffect(() => {
    if (state) {
      saveToLocalStorage(state)
    }
  }, [state])
  
  // Load from localStorage on initial render
  useEffect(() => {
    const savedState = loadFromLocalStorage()
    if (savedState) {
      dispatch({ type: ActionTypes.IMPORT_DATA, payload: { data: savedState, sheetId: savedState.activeSheetId } })
    }
  }, [])
  
  /**
   * Sets the active cell
   * @param {string} cellId - The cell ID
   */
  const setActiveCell = useCallback((cellId) => {
    dispatch({ type: ActionTypes.SET_ACTIVE_CELL, payload: cellId })
  }, [dispatch, ActionTypes.SET_ACTIVE_CELL])
  
  /**
   * Selects multiple cells
   * @param {Array} cellIds - Array of cell IDs
   */
  const selectCells = useCallback((cellIds) => {
    dispatch({ type: ActionTypes.SELECT_CELLS, payload: cellIds })
  }, [dispatch, ActionTypes.SELECT_CELLS])
  
  /**
   * Updates the value of a cell
   * @param {string} cellId - The cell ID
   * @param {string} value - The new value
   */
  const updateCellValue = useCallback((cellId, value) => {
    // Check if it's a formula
    const isFormula = value.startsWith('=')
    
    if (isFormula && formulaParser) {
      // Evaluate the formula
      try {
        const evaluatedValue = formulaParser.evaluate(value)
        
        // Track cell dependencies
        const cellsUsed = formulaParser.getCellsUsed()
        const newDependencies = { ...dependencies }
        
        cellsUsed.forEach(depCellId => {
          if (!newDependencies[depCellId]) {
            newDependencies[depCellId] = new Set()
          }
          newDependencies[depCellId].add(cellId)
        })
        
        setDependencies(newDependencies)
        
        // Update the cell with formula
        dispatch({
          type: ActionTypes.APPLY_FORMULA,
          payload: {
            cellId,
            formula: value,
            value: evaluatedValue
          }
        })
      } catch (error) {
        // Formula error
        dispatch({
          type: ActionTypes.APPLY_FORMULA,
          payload: {
            cellId,
            formula: value,
            value: '#ERROR!'
          }
        })
      }
    } else {
      // Regular value update
      dispatch({
        type: ActionTypes.UPDATE_CELL,
        payload: {
          cellId,
          value,
          formula: ''
        }
      })
      
      // Recalculate any cells that depend on this one
      if (dependencies[cellId]) {
        recalculateDependentCells(cellId)
      }
    }
  }, [dispatch, ActionTypes.APPLY_FORMULA, ActionTypes.UPDATE_CELL, dependencies, formulaParser])
  
  /**
   * Recalculates cells that depend on a changed cell
   * @param {string} changedCellId - The changed cell ID
   */
  const recalculateDependentCells = useCallback((changedCellId) => {
    if (!dependencies[changedCellId] || !formulaParser) return
    
    // Get cells that depend on the changed cell
    const dependentCells = [...dependencies[changedCellId]]
    
    // Update each dependent cell
    dependentCells.forEach(cellId => {
      const cellData = getCellData(cellId)
      
      if (cellData.formula) {
        try {
          const evaluatedValue = formulaParser.evaluate(cellData.formula)
          
          dispatch({
            type: ActionTypes.APPLY_FORMULA,
            payload: {
              cellId,
              formula: cellData.formula,
              value: evaluatedValue
            }
          })
          
          // Recursively update cells that depend on this one
          recalculateDependentCells(cellId)
        } catch (error) {
          dispatch({
            type: ActionTypes.APPLY_FORMULA,
            payload: {
              cellId,
              formula: cellData.formula,
              value: '#ERROR!'
            }
          })
        }
      }
    })
  }, [dependencies, formulaParser, getCellData, dispatch, ActionTypes.APPLY_FORMULA])
  
  /**
   * Updates formula bar value
   * @param {string} value - The new formula bar value
   */
  const updateFormulaBarValue = useCallback((value) => {
    dispatch({ type: ActionTypes.UPDATE_FORMULA_BAR, payload: value })
  }, [dispatch, ActionTypes.UPDATE_FORMULA_BAR])
  
  /**
   * Applies formula bar value to active cell
   */
  const applyFormulaBar = useCallback(() => {
    if (state.activeCell && state.formulaBarValue !== undefined) {
      updateCellValue(state.activeCell, state.formulaBarValue)
    }
  }, [state.activeCell, state.formulaBarValue, updateCellValue])
  
  /**
   * Applies number format to selected cells
   * @param {string} format - The number format to apply
   * @param {Object} options - Format options
   */
  const applyNumberFormat = useCallback((format, options = {}) => {
    const cellIds = state.selectedCells.length > 0 ? state.selectedCells : [state.activeCell]
    
    if (cellIds[0]) {
      dispatch({
        type: ActionTypes.FORMAT_CELLS,
        payload: {
          cellIds,
          formatting: {
            numberFormat: format,
            formatOptions: options
          }
        }
      })
    }
  }, [dispatch, ActionTypes.FORMAT_CELLS, state.selectedCells, state.activeCell])
  
  /**
   * Handles keyboard navigation
   * @param {string} direction - 'up', 'down', 'left', 'right', 'tab'
   * @param {string} currentCellId - Current cell ID
   * @returns {string} New cell ID
   */
  const navigateWithKeyboard = useCallback((direction, currentCellId) => {
    if (!currentCellId) return null
    
    const [col, row] = getCellIndices(currentCellId)
    
    const activeSheet = getActiveSheet()
    
    let newCol = col
    let newRow = row
    
    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1)
        break
      case 'down':
        newRow = Math.min(activeSheet.maxRow - 1, row + 1)
        break
      case 'left':
        newCol = Math.max(0, col - 1)
        break
      case 'right':
      case 'tab':
        newCol = Math.min(activeSheet.maxCol - 1, col + 1)
        break
      default:
        break
    }
    
    const newCellId = getCellId(newCol, newRow)
    return newCellId
  }, [getActiveSheet])
  
  /**
   * Formats selected cells
   * @param {Object} formatting - Formatting properties
   */
  const formatCells = useCallback((formatting) => {
    const cellIds = state.selectedCells.length > 0 ? state.selectedCells : [state.activeCell]
    
    if (cellIds[0]) {
      dispatch({
        type: ActionTypes.FORMAT_CELLS,
        payload: {
          cellIds,
          formatting
        }
      })
    }
  }, [dispatch, ActionTypes.FORMAT_CELLS, state.selectedCells, state.activeCell])
  
  /**
   * Copies selected cells
   */
  const copySelectedCells = useCallback(() => {
    if (state.selectedCells.length === 0 && !state.activeCell) return
    
    const cellsToCopy = state.selectedCells.length > 0 ? state.selectedCells : [state.activeCell]
    const clipboardData = copyCells(cellsToCopy, getCellData)
    
    dispatch({
      type: ActionTypes.COPY_CELLS,
      payload: clipboardData
    })
    
    return clipboardData
  }, [dispatch, ActionTypes.COPY_CELLS, state.selectedCells, state.activeCell, getCellData])
  
  /**
   * Cuts selected cells
   */
  const cutSelectedCells = useCallback(() => {
    if (state.selectedCells.length === 0 && !state.activeCell) return
    
    const cellsToCut = state.selectedCells.length > 0 ? state.selectedCells : [state.activeCell]
    const clipboardData = cutCells(cellsToCut, getCellData)
    
    dispatch({
      type: ActionTypes.CUT_CELLS,
      payload: clipboardData
    })
    
    return clipboardData
  }, [dispatch, ActionTypes.CUT_CELLS, state.selectedCells, state.activeCell, getCellData])
  
  /**
   * Pastes cells from clipboard
   * @param {string} targetCellId - Target cell ID
   */
  const pasteToCell = useCallback((targetCellId) => {
    if (!state.clipboard || !targetCellId) return
    
    dispatch({
      type: ActionTypes.PASTE_CELLS,
      payload: {
        targetCell: targetCellId
      }
    })
  }, [dispatch, ActionTypes.PASTE_CELLS, state.clipboard])
  
  /**
   * Clears selected cells
   */
  const clearSelectedCells = useCallback(() => {
    if (state.selectedCells.length === 0 && !state.activeCell) return
    
    const cellsToClear = state.selectedCells.length > 0 ? state.selectedCells : [state.activeCell]
    
    dispatch({
      type: ActionTypes.CLEAR_CELLS,
      payload: {
        cellIds: cellsToClear
      }
    })
  }, [dispatch, ActionTypes.CLEAR_CELLS, state.selectedCells, state.activeCell])
  
  /**
   * Sorts selected cells
   * @param {string} direction - Sort direction ('asc' or 'desc')
   */
  const sortSelectedCells = useCallback((direction = 'asc') => {
    if (state.selectedCells.length <= 1 && !state.activeCell) return
    
    const activeSheet = getActiveSheet()
    if (!activeSheet || !activeSheet.cells) return
    
    let startCol, startRow, endCol, endRow
    
    // Determine sort range
    if (state.selectedCells.length > 1) {
      // Get bounds of selection
      let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity
      
      state.selectedCells.forEach(cellId => {
        const [col, row] = getCellIndices(cellId)
        minCol = Math.min(minCol, col)
        maxCol = Math.max(maxCol, col)
        minRow = Math.min(minRow, row)
        maxRow = Math.max(maxRow, row)
      })
      
      startCol = minCol
      startRow = minRow
      endCol = maxCol
      endRow = maxRow
    } else {
      // Use active cell column
      const [col, row] = getCellIndices(state.activeCell)
      
      // Find data range in this column
      startCol = col
      endCol = col
      
      // Find start and end rows with data
      let r = 0
      while (r < activeSheet.maxRow) {
        const cellId = getCellId(col, r)
        if (activeSheet.cells[cellId] && activeSheet.cells[cellId].value) {
          startRow = r
          break
        }
        r++
      }
      
      r = activeSheet.maxRow - 1
      while (r >= 0) {
        const cellId = getCellId(col, r)
        if (activeSheet.cells[cellId] && activeSheet.cells[cellId].value) {
          endRow = r
          break
        }
        r--
      }
    }
    
    // Check if we found a valid range
    if (startCol === undefined || startRow === undefined || startCol > endCol || startRow > endRow) {
      return
    }
    
    // Perform sort
    const sortResults = sortRange(
      activeSheet.cells,
      startCol,
      startRow,
      endCol,
      endRow,
      startCol, // Sort by first column in selection
      direction === 'asc' ? SortType.ASCENDING : SortType.DESCENDING
    )
    
    // Apply updates
    if (sortResults.updates && sortResults.updates.length > 0) {
      dispatch({
        type: ActionTypes.BULK_UPDATE_CELLS,
        payload: {
          updates: sortResults.updates
        }
      })
    }
  }, [state.selectedCells, state.activeCell, getActiveSheet, dispatch, ActionTypes.BULK_UPDATE_CELLS])
  
  /**
   * Adds a new sheet
   */
  const addSheet = useCallback(() => {
    dispatch({ type: ActionTypes.ADD_SHEET })
  }, [dispatch, ActionTypes.ADD_SHEET])
  
  /**
   * Deletes a sheet
   * @param {string} sheetId - Sheet ID to delete
   */
  const deleteSheet = useCallback((sheetId) => {
    dispatch({ 
      type: ActionTypes.DELETE_SHEET,
      payload: { sheetId }
    })
  }, [dispatch, ActionTypes.DELETE_SHEET])
  
  /**
   * Renames a sheet
   * @param {string} sheetId - Sheet ID
   * @param {string} name - New name
   */
  const renameSheet = useCallback((sheetId, name) => {
    dispatch({
      type: ActionTypes.RENAME_SHEET,
      payload: { sheetId, name }
    })
  }, [dispatch, ActionTypes.RENAME_SHEET])
  
  /**
   * Switches to a different sheet
   * @param {string} sheetId - Sheet ID
   */
  const switchSheet = useCallback((sheetId) => {
    dispatch({
      type: ActionTypes.SWITCH_SHEET,
      payload: { sheetId }
    })
  }, [dispatch, ActionTypes.SWITCH_SHEET])
  
  /**
   * Exports the active sheet to CSV
   */
  const exportCurrentSheet = useCallback(() => {
    const activeSheet = getActiveSheet()
    if (!activeSheet) return
    
    const csvData = exportToCsv(activeSheet)
    downloadCsv(csvData, `${activeSheet.name}.csv`)
  }, [getActiveSheet])
  
  /**
   * Imports data from CSV
   * @param {string} csvData - CSV data
   */
  const importCsvData = useCallback((csvData) => {
    const importedData = importFromCsv(csvData)
    
    if (importedData) {
      const newSheetId = `sheet${state.sheets.length + 1}`
      
      dispatch({
        type: ActionTypes.IMPORT_DATA,
        payload: {
          data: {
            ...importedData,
            name: `Imported Sheet ${state.sheets.length + 1}`
          },
          sheetId: newSheetId
        }
      })
    }
  }, [dispatch, ActionTypes.IMPORT_DATA, state.sheets])
  
  /**
   * Resizes a column
   * @param {number} colIndex - Column index
   * @param {number} width - New width
   */
  const resizeColumn = useCallback((colIndex, width) => {
    dispatch({
      type: ActionTypes.RESIZE_COLUMN,
      payload: { colIndex, width }
    })
  }, [dispatch, ActionTypes.RESIZE_COLUMN])
  
  /**
   * Resizes a row
   * @param {number} rowIndex - Row index
   * @param {number} height - New height
   */
  const resizeRow = useCallback((rowIndex, height) => {
    dispatch({
      type: ActionTypes.RESIZE_ROW,
      payload: { rowIndex, height }
    })
  }, [dispatch, ActionTypes.RESIZE_ROW])
  
  /**
   * Performs undo operation
   */
  const undo = useCallback(() => {
    dispatch({ type: ActionTypes.UNDO })
  }, [dispatch, ActionTypes.UNDO])
  
  /**
   * Performs redo operation
   */
  const redo = useCallback(() => {
    dispatch({ type: ActionTypes.REDO })
  }, [dispatch, ActionTypes.REDO])
  
  /**
   * Adds data validation to cells
   * @param {Array} cellIds - Array of cell IDs
   * @param {Object} validationRule - Validation rule
   */
  const addDataValidation = useCallback((cellIds, validationRule) => {
    if (!cellIds || cellIds.length === 0) return
    
    dispatch({
      type: ActionTypes.FORMAT_CELLS,
      payload: {
        cellIds,
        formatting: {
          dataValidation: validationRule
        }
      }
    })
  }, [dispatch, ActionTypes.FORMAT_CELLS])
  
  /**
   * Inserts rows at the specified position
   * @param {number} rowIndex - Row index to insert at
   * @param {number} count - Number of rows to insert
   */
  const insertRows = useCallback((rowIndex, count = 1) => {
    dispatch({
      type: ActionTypes.INSERT_ROWS,
      payload: { rowIndex, count }
    })
  }, [dispatch, ActionTypes.INSERT_ROWS])
  
  /**
   * Inserts columns at the specified position
   * @param {number} colIndex - Column index to insert at
   * @param {number} count - Number of columns to insert
   */
  const insertColumns = useCallback((colIndex, count = 1) => {
    dispatch({
      type: ActionTypes.INSERT_COLUMNS,
      payload: { colIndex, count }
    })
  }, [dispatch, ActionTypes.INSERT_COLUMNS])
  
  /**
   * Deletes rows at the specified position
   * @param {number} rowIndex - Starting row index to delete
   * @param {number} count - Number of rows to delete
   */
  const deleteRows = useCallback((rowIndex, count = 1) => {
    dispatch({
      type: ActionTypes.DELETE_ROWS,
      payload: { rowIndex, count }
    })
  }, [dispatch, ActionTypes.DELETE_ROWS])
  
  /**
   * Deletes columns at the specified position
   * @param {number} colIndex - Starting column index to delete
   * @param {number} count - Number of columns to delete
   */
  const deleteColumns = useCallback((colIndex, count = 1) => {
    dispatch({
      type: ActionTypes.DELETE_COLUMNS,
      payload: { colIndex, count }
    })
  }, [dispatch, ActionTypes.DELETE_COLUMNS])
  
  /**
   * Freezes rows or columns
   * @param {number} rowCount - Number of rows to freeze
   * @param {number} colCount - Number of columns to freeze
   */
  const freezePanes = useCallback((rowCount = 0, colCount = 0) => {
    dispatch({
      type: ActionTypes.FREEZE_PANES,
      payload: { rowCount, colCount }
    })
  }, [dispatch, ActionTypes.FREEZE_PANES])
  
  /**
   * Searches for a value in the active sheet
   * @param {string} searchText - Text to search for
   * @param {boolean} matchCase - Whether to match case
   * @param {boolean} exactMatch - Whether to require exact matches
   * @returns {Array} - Array of cell IDs that match the search
   */
  const searchSheet = useCallback((searchText, matchCase = false, exactMatch = false) => {
    if (!searchText) return []
    
    const activeSheet = getActiveSheet()
    if (!activeSheet || !activeSheet.cells) return []
    
    const results = []
    
    for (const cellId in activeSheet.cells) {
      const cellData = activeSheet.cells[cellId]
      
      if (!cellData.value && !cellData.formula) continue
      
      const value = String(cellData.value || '')
      let isMatch = false
      
      if (exactMatch) {
        isMatch = matchCase 
          ? value === searchText 
          : value.toLowerCase() === searchText.toLowerCase()
      } else {
        isMatch = matchCase 
          ? value.includes(searchText) 
          : value.toLowerCase().includes(searchText.toLowerCase())
      }
      
      if (isMatch) {
        results.push(cellId)
      }
    }
    
    return results
  }, [getActiveSheet])
  
  /**
   * Creates a data visualization from selected data
   * @param {string} chartType - Type of chart to create
   * @param {Object} options - Chart options
   */
  const createChart = useCallback((chartType, options = {}) => {
    if (state.selectedCells.length <= 1 && !state.activeCell) return null
    
    const activeSheet = getActiveSheet()
    if (!activeSheet || !activeSheet.cells) return null
    
    // Determine data range
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity
    
    const cellsToInclude = state.selectedCells.length > 0 
      ? state.selectedCells 
      : [state.activeCell]
    
    cellsToInclude.forEach(cellId => {
      const [col, row] = getCellIndices(cellId)
      minCol = Math.min(minCol, col)
      maxCol = Math.max(maxCol, col)
      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
    })
    
    // Extract data from range
    const chartData = {
      labels: [],
      datasets: []
    }
    
    // Decide how to extract data based on selection shape
    const isMultiRow = maxRow > minRow
    const isMultiColumn = maxCol > minCol
    
    if (isMultiRow && isMultiColumn) {
      // 2D selection - first row as labels, each column as dataset
      // Get labels from first row
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = getCellId(col, minRow)
        chartData.labels.push(activeSheet.cells[cellId]?.value || '')
      }
      
      // Get datasets from remaining rows
      for (let row = minRow + 1; row <= maxRow; row++) {
        const dataset = {
          label: activeSheet.cells[getCellId(minCol, row)]?.value || `Series ${row - minRow}`,
          data: []
        }
        
        for (let col = minCol + 1; col <= maxCol; col++) {
          const cellId = getCellId(col, row)
          const value = activeSheet.cells[cellId]?.value || 0
          dataset.data.push(parseFloat(value) || 0)
        }
        
        chartData.datasets.push(dataset)
      }
    } else if (isMultiRow) {
      // Single column selection - use as one dataset
      const dataset = {
        label: activeSheet.cells[getCellId(minCol, minRow)]?.value || 'Series 1',
        data: []
      }
      
      for (let row = minRow + 1; row <= maxRow; row++) {
        const cellId = getCellId(minCol, row)
        const rowLabel = activeSheet.cells[getCellId(minCol - 1, row)]?.value || `Item ${row}`
        chartData.labels.push(rowLabel)
        
        const value = activeSheet.cells[cellId]?.value || 0
        dataset.data.push(parseFloat(value) || 0)
      }
      
      chartData.datasets.push(dataset)
    } else {
      // Single row selection - use as one dataset
      const dataset = {
        label: activeSheet.cells[getCellId(minCol, minRow - 1)]?.value || 'Series 1',
        data: []
      }
      
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = getCellId(col, minRow)
        const colLabel = activeSheet.cells[getCellId(col, minRow - 1)]?.value || `Item ${col}`
        chartData.labels.push(colLabel)
        
        const value = activeSheet.cells[cellId]?.value || 0
        dataset.data.push(parseFloat(value) || 0)
      }
      
      chartData.datasets.push(dataset)
    }
    
    return {
      type: chartType,
      data: chartData,
      options
    }
  }, [state.selectedCells, state.activeCell, getActiveSheet])
  
  return {
    setActiveCell,
    selectCells,
    updateCellValue,
    updateFormulaBarValue,
    applyFormulaBar,
    navigateWithKeyboard,
    formatCells,
    applyNumberFormat,
    copySelectedCells,
    cutSelectedCells,
    pasteToCell,
    clearSelectedCells,
    sortSelectedCells,
    addSheet,
    deleteSheet,
    renameSheet,
    switchSheet,
    exportCurrentSheet,
    importCsvData,
    resizeColumn,
    resizeRow,
    undo,
    redo,
    addDataValidation,
    insertRows,
    insertColumns,
    deleteRows,
    deleteColumns,
    freezePanes,
    searchSheet,
    createChart,
    canUndo: state.undoStack?.length > 0,
    canRedo: state.redoStack?.length > 0
  }
}

export default useSpreadsheetOperations