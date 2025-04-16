import { useCallback, useEffect, useState } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { FormulaParser } from '../utils/formulaParser'
import { copyCells, cutCells, pasteCells, parseClipboardText } from '../utils/clipboardActions'
import { saveToLocalStorage, loadFromLocalStorage, exportToCsv, downloadCsv, importFromCsv } from '../utils/dataHelpers'

/**
 * Custom hook for spreadsheet operations
 * @returns {Object} Object containing spreadsheet operations
 */
function useSpreadsheetOperations() {
  const { state, dispatch, ActionTypes, getCellValue, getCellData, getActiveSheet } = useSpreadsheet()
  const [formulaParser, setFormulaParser] = useState(null)
  const [dependencies, setDependencies] = useState({})
  
  // Initialize the formula parser
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
   * Handles keyboard navigation
   * @param {string} direction - 'up', 'down', 'left', 'right', 'tab'
   * @param {string} currentCellId - Current cell ID
   * @returns {string} New cell ID
   */
  const navigateWithKeyboard = useCallback((direction, currentCellId) => {
    if (!currentCellId) return null
    
    const [col, row] = currentCellId.match(/([A-Z]+)(\d+)/).slice(1)
    let colIndex = 0
    
    // Convert column letters to index
    for (let i = 0; i < col.length; i++) {
      colIndex = colIndex * 26 + (col.charCodeAt(i) - 64)
    }
    colIndex--
    
    const rowIndex = parseInt(row) - 1
    const activeSheet = getActiveSheet()
    
    let newCol = colIndex
    let newRow = rowIndex
    
    switch (direction) {
      case 'up':
        newRow = Math.max(0, rowIndex - 1)
        break
      case 'down':
        newRow = Math.min(activeSheet.maxRow - 1, rowIndex + 1)
        break
      case 'left':
        newCol = Math.max(0, colIndex - 1)
        break
      case 'right':
      case 'tab':
        newCol = Math.min(activeSheet.maxCol - 1, colIndex + 1)
        break
      default:
        break
    }
    
    // Convert back to cell ID
    let newColStr = ''
    let temp = newCol + 1
    
    while (temp > 0) {
      const remainder = (temp - 1) % 26
      newColStr = String.fromCharCode(65 + remainder) + newColStr
      temp = Math.floor((temp - 1) / 26)
    }
    
    const newCellId = `${newColStr}${newRow + 1}`
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
   * Adds a new sheet
   */
  const addSheet = useCallback(() => {
    dispatch({ type: ActionTypes.ADD_SHEET })
  }, [dispatch, ActionTypes.ADD_SHEET])
  
  /**
   * Deletes the active sheet
   */
  const deleteSheet = useCallback(() => {
    dispatch({ type: ActionTypes.DELETE_SHEET })
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
  
  return {
    setActiveCell,
    selectCells,
    updateCellValue,
    updateFormulaBarValue,
    applyFormulaBar,
    navigateWithKeyboard,
    formatCells,
    copySelectedCells,
    cutSelectedCells,
    pasteToCell,
    clearSelectedCells,
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
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0
  }
}

export default useSpreadsheetOperations