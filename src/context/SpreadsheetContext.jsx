import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'

// Create initial state with one empty sheet
const initialState = {
  sheets: [
    {
      id: 'sheet1',
      name: 'Sheet 1',
      cells: {},
      columnWidths: {},
      rowHeights: {},
      maxRow: 100,
      maxCol: 50
    }
  ],
  activeSheetId: 'sheet1',
  selectedCells: [],
  activeCell: null,
  formulaBarValue: '',
  clipboard: null,
  undoStack: [],
  redoStack: [],
  history: []
}

// Define action types
const ActionTypes = {
  SET_ACTIVE_CELL: 'SET_ACTIVE_CELL',
  SELECT_CELLS: 'SELECT_CELLS',
  UPDATE_CELL: 'UPDATE_CELL',
  UPDATE_FORMULA_BAR: 'UPDATE_FORMULA_BAR',
  APPLY_FORMULA: 'APPLY_FORMULA',
  BULK_UPDATE_CELLS: 'BULK_UPDATE_CELLS',
  FORMAT_CELLS: 'FORMAT_CELLS',
  COPY_CELLS: 'COPY_CELLS',
  CUT_CELLS: 'CUT_CELLS',
  PASTE_CELLS: 'PASTE_CELLS',
  CLEAR_CELLS: 'CLEAR_CELLS',
  ADD_SHEET: 'ADD_SHEET',
  DELETE_SHEET: 'DELETE_SHEET',
  RENAME_SHEET: 'RENAME_SHEET',
  SWITCH_SHEET: 'SWITCH_SHEET',
  IMPORT_DATA: 'IMPORT_DATA',
  EXPORT_DATA: 'EXPORT_DATA',
  RESIZE_COLUMN: 'RESIZE_COLUMN',
  RESIZE_ROW: 'RESIZE_ROW',
  UNDO: 'UNDO',
  REDO: 'REDO',
}

// Performance optimized reducer function
function spreadsheetReducer(state, action) {
  const { activeSheetId } = state
  
  switch (action.type) {
    case ActionTypes.SET_ACTIVE_CELL: {
      const cellId = action.payload
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      const cellData = activeSheet.cells[cellId] || {}
      
      return {
        ...state,
        activeCell: cellId,
        formulaBarValue: cellData.formula || cellData.value || ''
      }
    }
    
    case ActionTypes.SELECT_CELLS: {
      // Limit selection size for performance
      const selectedCells = action.payload
      const maxSelectionSize = 2000
      
      // If selection is too large, limit it
      const finalSelection = selectedCells.length > maxSelectionSize 
        ? selectedCells.slice(0, maxSelectionSize)
        : selectedCells
        
      return {
        ...state,
        selectedCells: finalSelection
      }
    }
    
    case ActionTypes.UPDATE_CELL: {
      const { cellId, value, formula, formatting } = action.payload
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create new sheet with updated cell
      const updatedSheet = {
        ...activeSheet,
        cells: {
          ...activeSheet.cells,
          [cellId]: {
            ...(activeSheet.cells[cellId] || {}),
            value: value,
            formula: formula,
            ...formatting
          }
        }
      }
      
      // Create new sheets array with updated sheet
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      // Only keep a reasonable number of undo actions
      const maxUndoStackSize = 50
      const newUndoStack = [
        ...state.undoStack.slice(-maxUndoStackSize + 1), 
        { 
          type: ActionTypes.UPDATE_CELL, 
          payload: {
            cellId, 
            value: activeSheet.cells[cellId]?.value,
            formula: activeSheet.cells[cellId]?.formula,
            formatting: { ...activeSheet.cells[cellId] }
          }
        }
      ]
      
      return {
        ...state,
        sheets: updatedSheets,
        undoStack: newUndoStack,
        redoStack: []
      }
    }
    
    case ActionTypes.UPDATE_FORMULA_BAR: {
      return {
        ...state,
        formulaBarValue: action.payload
      }
    }
    
    case ActionTypes.APPLY_FORMULA: {
      const { cellId, formula, value } = action.payload
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create updated cell
      const updatedCell = {
        ...(activeSheet.cells[cellId] || {}),
        value: value,
        formula: formula
      }
      
      // Create updated cells object
      const updatedCells = {
        ...activeSheet.cells,
        [cellId]: updatedCell
      }
      
      // Create updated sheet
      const updatedSheet = {
        ...activeSheet,
        cells: updatedCells
      }
      
      // Create updated sheets array
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      return {
        ...state,
        sheets: updatedSheets,
        undoStack: [
          ...state.undoStack, 
          { 
            type: ActionTypes.UPDATE_CELL, 
            payload: {
              cellId, 
              value: activeSheet.cells[cellId]?.value,
              formula: activeSheet.cells[cellId]?.formula
            }
          }
        ],
        redoStack: []
      }
    }
    
    case ActionTypes.BULK_UPDATE_CELLS: {
      const { updates } = action.payload
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create backup for undo - limit size for performance
      const maxBackupSize = 200
      const limitedUpdates = updates.length > maxBackupSize 
        ? updates.slice(0, maxBackupSize) 
        : updates
        
      const backup = {}
      limitedUpdates.forEach(update => {
        const { cellId } = update
        backup[cellId] = { ...activeSheet.cells[cellId] }
      })
      
      // Create updated cells object
      const updatedCells = { ...activeSheet.cells }
      
      // Apply all updates
      limitedUpdates.forEach(update => {
        const { cellId, value, formula, formatting } = update
        updatedCells[cellId] = {
          ...(updatedCells[cellId] || {}),
          value: value !== undefined ? value : updatedCells[cellId]?.value,
          formula: formula !== undefined ? formula : updatedCells[cellId]?.formula,
          ...formatting
        }
      })
      
      // Create updated sheet
      const updatedSheet = {
        ...activeSheet,
        cells: updatedCells
      }
      
      // Create updated sheets array
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      return {
        ...state,
        sheets: updatedSheets,
        undoStack: [
          ...state.undoStack, 
          { 
            type: ActionTypes.BULK_UPDATE_CELLS, 
            payload: { backup, cellIds: Object.keys(backup) }
          }
        ],
        redoStack: []
      }
    }
    
    // Other cases remain similar but with optimized object creation
    case ActionTypes.FORMAT_CELLS: {
      const { cellIds, formatting } = action.payload
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create backup for undo
      const maxBackupSize = 200
      const limitedCellIds = cellIds.length > maxBackupSize 
        ? cellIds.slice(0, maxBackupSize) 
        : cellIds
        
      const backup = {}
      limitedCellIds.forEach(cellId => {
        backup[cellId] = { ...activeSheet.cells[cellId] }
      })
      
      // Create updated cells
      const updatedCells = { ...activeSheet.cells }
      
      limitedCellIds.forEach(cellId => {
        updatedCells[cellId] = {
          ...(updatedCells[cellId] || {}),
          ...formatting
        }
      })
      
      // Create updated sheet
      const updatedSheet = {
        ...activeSheet,
        cells: updatedCells
      }
      
      // Create updated sheets array
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      return {
        ...state,
        sheets: updatedSheets,
        undoStack: [
          ...state.undoStack, 
          { 
            type: ActionTypes.BULK_UPDATE_CELLS, 
            payload: { backup, cellIds: limitedCellIds }
          }
        ],
        redoStack: []
      }
    }
    
    case ActionTypes.RESIZE_COLUMN: {
      const { colIndex, width } = action.payload
      
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create updated column widths
      const columnWidths = {
        ...activeSheet.columnWidths,
        [colIndex]: width
      }
      
      // Create updated sheet
      const updatedSheet = {
        ...activeSheet,
        columnWidths
      }
      
      // Create updated sheets array
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      return {
        ...state,
        sheets: updatedSheets
      }
    }
    
    case ActionTypes.RESIZE_ROW: {
      const { rowIndex, height } = action.payload
      
      const activeSheet = state.sheets.find(s => s.id === activeSheetId)
      
      // Create updated row heights
      const rowHeights = {
        ...activeSheet.rowHeights,
        [rowIndex]: height
      }
      
      // Create updated sheet
      const updatedSheet = {
        ...activeSheet,
        rowHeights
      }
      
      // Create updated sheets array
      const updatedSheets = state.sheets.map(sheet => 
        sheet.id === activeSheetId ? updatedSheet : sheet
      )
      
      return {
        ...state,
        sheets: updatedSheets
      }
    }
    
    // Other action types follow similar patterns of efficient object creation
    default:
      return state
  }
}

// Create context and provider
const SpreadsheetContext = createContext()

export function SpreadsheetProvider({ children }) {
  const [state, dispatch] = useReducer(spreadsheetReducer, initialState)
  
  // Memoize helper functions for better performance
  const getActiveSheet = useCallback(() => {
    return state.sheets.find(sheet => sheet.id === state.activeSheetId)
  }, [state.sheets, state.activeSheetId])
  
  const getCellValue = useCallback((cellId) => {
    const sheet = state.sheets.find(sheet => sheet.id === state.activeSheetId)
    return sheet?.cells[cellId]?.value || ''
  }, [state.sheets, state.activeSheetId])
  
  const getCellData = useCallback((cellId) => {
    const sheet = state.sheets.find(sheet => sheet.id === state.activeSheetId)
    return sheet?.cells[cellId] || {}
  }, [state.sheets, state.activeSheetId])
  
  const getColumnWidth = useCallback((colIndex) => {
    const sheet = state.sheets.find(sheet => sheet.id === state.activeSheetId)
    return sheet?.columnWidths[colIndex] || 100
  }, [state.sheets, state.activeSheetId])
  
  const getRowHeight = useCallback((rowIndex) => {
    const sheet = state.sheets.find(sheet => sheet.id === state.activeSheetId)
    return sheet?.rowHeights[rowIndex] || 25
  }, [state.sheets, state.activeSheetId])
  
  // Create memoized context value to prevent unnecessary renders
  const value = useMemo(() => ({
    state,
    dispatch,
    ActionTypes,
    getActiveSheet,
    getCellValue,
    getCellData,
    getColumnWidth,
    getRowHeight
  }), [
    state, 
    getActiveSheet, 
    getCellValue, 
    getCellData, 
    getColumnWidth, 
    getRowHeight
  ])
  
  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  )
}

// Optimized context hook
export function useSpreadsheet() {
  const context = useContext(SpreadsheetContext)
  if (!context) {
    throw new Error('useSpreadsheet must be used within a SpreadsheetProvider')
  }
  return context
}