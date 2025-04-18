// src/components/Toolbar.jsx
import { useState, useRef, useCallback } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations'
import { NumberFormats } from '../utils/numberFormatter'

/**
 *  toolbar component with additional formatting options
 */
function Toolbar() {
  const { state } = useSpreadsheet()
  const { 
    formatCells, 
    copySelectedCells, 
    cutSelectedCells, 
    clearSelectedCells,
    exportCurrentSheet,
    importCsvData,
    undo,
    redo,
    canUndo,
    canRedo,
    sortSelectedCells,
    applyNumberFormat
  } = useSpreadsheetOperations()
  
  const fileInputRef = useRef(null)
  
  // State for dropdowns and color pickers
  const [colorPicker, setColorPicker] = useState({
    visible: false,
    type: null, // 'text' or 'background'
    x: 0,
    y: 0
  })
  
  const [showBorderMenu, setShowBorderMenu] = useState(false)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  
  // Toggle bold formatting
  const toggleBold = () => {
    const activeCellData = getCurrentCellData()
    formatCells({ bold: !activeCellData?.bold })
  }
  
  // Toggle italic formatting
  const toggleItalic = () => {
    const activeCellData = getCurrentCellData()
    formatCells({ italic: !activeCellData?.italic })
  }
  
  // Toggle underline formatting
  const toggleUnderline = () => {
    const activeCellData = getCurrentCellData()
    formatCells({ underline: !activeCellData?.underline })
  }
  
  // Set text alignment
  const setAlignment = (align) => {
    formatCells({ align })
  }
  
  // Apply number format
  const handleNumberFormat = (format) => {
    applyNumberFormat(format)
    setShowFormatMenu(false)
  }
  
  // Handle text color picker
  const handleTextColor = (e) => {
    setColorPicker({
      visible: true,
      type: 'text',
      x: e.clientX,
      y: e.clientY
    })
  }
  
  // Handle background color picker
  const handleBackgroundColor = (e) => {
    setColorPicker({
      visible: true,
      type: 'background',
      x: e.clientX,
      y: e.clientY
    })
  }
  
  // Apply color selection
  const applyColor = (color) => {
    if (colorPicker.type === 'text') {
      formatCells({ textColor: color })
    } else if (colorPicker.type === 'background') {
      formatCells({ bgColor: color })
    }
    
    setColorPicker({ visible: false, type: null, x: 0, y: 0 })
  }
  
  // Handle border menu
  const handleBorderMenu = (e) => {
    setShowBorderMenu(!showBorderMenu)
  }
  
  // Apply border style
  const applyBorder = (position, style = 'thin') => {
    const borders = {}
    
    if (position === 'all') {
      borders.borderTop = style
      borders.borderRight = style
      borders.borderBottom = style
      borders.borderLeft = style
    } else if (position === 'outline') {
      // This requires special handling for cell ranges
      // For simplicity, we'll just apply to all cells for now
      borders.borderTop = style
      borders.borderRight = style
      borders.borderBottom = style
      borders.borderLeft = style
    } else if (position === 'none') {
      borders.borderTop = 'none'
      borders.borderRight = 'none'
      borders.borderBottom = 'none'
      borders.borderLeft = 'none'
    } else {
      borders[`border${position.charAt(0).toUpperCase() + position.slice(1)}`] = style
    }
    
    formatCells(borders)
    setShowBorderMenu(false)
  }
  
  // Handle format menu
  const handleFormatMenu = () => {
    setShowFormatMenu(!showFormatMenu)
  }
  
  // Handle sort menu
  const handleSortMenu = () => {
    setShowSortMenu(!showSortMenu)
  }
  
  // Handle sorting
  const handleSort = (direction) => {
    sortSelectedCells(direction)
    setShowSortMenu(false)
  }
  
  // Handle file import
  const handleImport = () => {
    fileInputRef.current?.click()
  }
  
  // Process uploaded file
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const content = event.target.result
      importCsvData(content)
    }
    
    reader.readAsText(file)
    
    // Reset file input
    e.target.value = null
  }
  
  // Helper to get current cell's data
  const getCurrentCellData = useCallback(() => {
    if (!state.activeCell && (!state.selectedCells || state.selectedCells.length === 0)) {
      return null
    }
    
    const activeSheet = state.sheets.find(s => s.id === state.activeSheetId)
    return activeSheet.cells[state.activeCell] || {}
  }, [state.activeCell, state.activeSheetId, state.selectedCells, state.sheets])
  
  // SVG icons for buttons
  const Icons = {
    bold: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
    italic: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
    underline: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>,
    alignLeft: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>,
    alignCenter: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>,
    alignRight: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>,
    textColor: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3L5 21"></path><path d="M15 3l4 18"></path><path d="M5 12h14"></path></svg>,
    bgColor: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20.7c-.6.3-2.6 1.3-4 1.3-2.6 0-3.4-1.8-5-1.8-2.4 0-5 3.2-5 3.2V8l7-6s9 5 9 11c0 4-1.4 6.4-2 7.7z"></path><path d="M9 14c.2-2.8 1.2-5 3-7"></path></svg>,
    border: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>,
    format: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"></path><path d="M9 20h6"></path><path d="M12 4v16"></path></svg>,
    sort: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h10"></path><path d="M11 9h7"></path><path d="M11 13h4"></path><path d="M3 17l3 3 3-3"></path><path d="M6 18V4"></path></svg>,
    undo: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>,
    redo: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"></path></svg>,
    copy: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>,
    cut: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>,
    clear: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>,
    export: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
    import: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
  }
  
  // Color palette for the color picker
  const colorPalette = [
    '#000000', '#343a40', '#495057', '#868e96', '#adb5bd', '#ced4da', '#dee2e6', '#e9ecef', '#f1f3f5', '#ffffff',
    '#c92a2a', '#a61e4d', '#862e9c', '#5f3dc4', '#364fc7', '#1864ab', '#0b7285', '#087f5b', '#2b8a3e', '#5c940d',
    '#e03131', '#d6336c', '#9c36b5', '#6741d9', '#3b5bdb', '#1c7ed6', '#0c8599', '#099268', '#2f9e44', '#66a80f',
    '#fa5252', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d', 
    '#ff8787', '#ffa8c5', '#da77f2', '#b197fc', '#92a9fd', '#74c0fc', '#66d9e8', '#63e6be', '#8ce99a', '#c0eb75',
    '#ffc9c9', '#ffdbe4', '#ecdcf9', '#dbe4ff', '#c5f6fa', '#96f2d7', '#c3fae8', '#d3f9d8', '#e9fac8'
  ]
  
  return (
    <div className="toolbar">
      {/* File operations */}
      <div className="toolbar-group">
        <button onClick={exportCurrentSheet} title="Export to CSV" className="tooltip" data-tooltip="Export to CSV">
          {Icons.export}
          <span>Export</span>
        </button>
        <button onClick={handleImport} title="Import from CSV" className="tooltip" data-tooltip="Import from CSV">
          {Icons.import}
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="file-input"
          accept=".csv"
          onChange={handleFileUpload}
        />
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Edit operations */}
      <div className="toolbar-group">
        <button 
          onClick={undo} 
          disabled={!canUndo} 
          title="Undo (Ctrl+Z)" 
          className="icon-button tooltip" 
          data-tooltip="Undo"
        >
          {Icons.undo}
        </button>
        <button 
          onClick={redo} 
          disabled={!canRedo} 
          title="Redo (Ctrl+Y)" 
          className="icon-button tooltip" 
          data-tooltip="Redo"
        >
          {Icons.redo}
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Clipboard operations */}
      <div className="toolbar-group">
        <button 
          onClick={copySelectedCells} 
          title="Copy (Ctrl+C)" 
          className="icon-button tooltip" 
          data-tooltip="Copy"
        >
          {Icons.copy}
        </button>
        <button 
          onClick={cutSelectedCells} 
          title="Cut (Ctrl+X)" 
          className="icon-button tooltip" 
          data-tooltip="Cut"
        >
          {Icons.cut}
        </button>
        <button 
          onClick={clearSelectedCells} 
          title="Clear (Delete)" 
          className="icon-button tooltip" 
          data-tooltip="Clear"
        >
          {Icons.clear}
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Text formatting */}
      <div className="toolbar-group">
        <button 
          onClick={toggleBold} 
          className={`icon-button tooltip ${getCurrentCellData()?.bold ? 'active' : ''}`}
          title="Bold (Ctrl+B)"
          data-tooltip="Bold"
          style={{ fontWeight: getCurrentCellData()?.bold ? 'bold' : 'normal' }}
        >
          {Icons.bold}
        </button>
        <button 
          onClick={toggleItalic} 
          className={`icon-button tooltip ${getCurrentCellData()?.italic ? 'active' : ''}`}
          title="Italic (Ctrl+I)"
          data-tooltip="Italic"
          style={{ fontStyle: getCurrentCellData()?.italic ? 'italic' : 'normal' }}
        >
          {Icons.italic}
        </button>
        <button 
          onClick={toggleUnderline} 
          className={`icon-button tooltip ${getCurrentCellData()?.underline ? 'active' : ''}`}
          title="Underline (Ctrl+U)"
          data-tooltip="Underline"
          style={{ textDecoration: getCurrentCellData()?.underline ? 'underline' : 'none' }}
        >
          {Icons.underline}
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Alignment */}
      <div className="toolbar-group">
        <button 
          onClick={() => setAlignment('left')} 
          className={`icon-button tooltip ${getCurrentCellData()?.align === 'left' ? 'active' : ''}`}
          title="Align Left"
          data-tooltip="Align Left"
        >
          {Icons.alignLeft}
        </button>
        <button 
          onClick={() => setAlignment('center')} 
          className={`icon-button tooltip ${getCurrentCellData()?.align === 'center' ? 'active' : ''}`}
          title="Align Center"
          data-tooltip="Align Center"
        >
          {Icons.alignCenter}
        </button>
        <button 
          onClick={() => setAlignment('right')} 
          className={`icon-button tooltip ${getCurrentCellData()?.align === 'right' ? 'active' : ''}`}
          title="Align Right"
          data-tooltip="Align Right"
        >
          {Icons.alignRight}
        </button>
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Border options */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button 
          onClick={handleBorderMenu}
          className="icon-button tooltip"
          title="Borders"
          data-tooltip="Borders"
        >
          {Icons.border}
        </button>
        
        {showBorderMenu && (
          <div className="dropdown-menu border-menu">
            <div className="dropdown-item" onClick={() => applyBorder('all')}>
              All Borders
            </div>
            <div className="dropdown-item" onClick={() => applyBorder('outline')}>
              Outside Borders
            </div>
            <div className="dropdown-item" onClick={() => applyBorder('top')}>
              Top Border
            </div>
            <div className="dropdown-item" onClick={() => applyBorder('right')}>
              Right Border
            </div>
            <div className="dropdown-item" onClick={() => applyBorder('bottom')}>
              Bottom Border
            </div>
            <div className="dropdown-item" onClick={() => applyBorder('left')}>
              Left Border
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item" onClick={() => applyBorder('none')}>
              No Borders
            </div>
          </div>
        )}
      </div>
      
      {/* Number Formatting */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button 
          onClick={handleFormatMenu}
          className="icon-button tooltip"
          title="Number Format"
          data-tooltip="Number Format"
        >
          {Icons.format}
        </button>
        
        {showFormatMenu && (
          <div className="dropdown-menu format-menu">
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.GENERAL)}>
              General
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.NUMBER)}>
              Number
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.CURRENCY)}>
              Currency
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.PERCENTAGE)}>
              Percentage
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.DATE)}>
              Date
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.TIME)}>
              Time
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.SCIENTIFIC)}>
              Scientific
            </div>
            <div className="dropdown-item" onClick={() => handleNumberFormat(NumberFormats.TEXT)}>
              Text
            </div>
          </div>
        )}
      </div>
      
      {/* Sort Options */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button 
          onClick={handleSortMenu}
          className="icon-button tooltip"
          title="Sort"
          data-tooltip="Sort"
        >
          {Icons.sort}
        </button>
        
        {showSortMenu && (
          <div className="dropdown-menu sort-menu">
            <div className="dropdown-item" onClick={() => handleSort('asc')}>
              Sort A to Z
            </div>
            <div className="dropdown-item" onClick={() => handleSort('desc')}>
              Sort Z to A
            </div>
            <div className="dropdown-item" onClick={() => handleSort('ascNum')}>
              Sort Smallest to Largest
            </div>
            <div className="dropdown-item" onClick={() => handleSort('descNum')}>
              Sort Largest to Smallest
            </div>
          </div>
        )}
      </div>
      
      <div className="toolbar-divider" />
      
      {/* Colors */}
      <div className="toolbar-group">
        <button 
          onClick={handleTextColor} 
          className="icon-button tooltip"
          title="Text Color"
          data-tooltip="Text Color"
          style={{ color: getCurrentCellData()?.textColor || 'var(--toolbar-icon)' }}
        >
          {Icons.textColor}
        </button>
        <button 
          onClick={handleBackgroundColor} 
          className="icon-button tooltip"
          title="Background Color"
          data-tooltip="Background Color"
          style={{ 
            backgroundColor: getCurrentCellData()?.bgColor || 'transparent',
            border: getCurrentCellData()?.bgColor ? '1px solid var(--border-color)' : '1px solid transparent'
          }}
        >
          {Icons.bgColor}
        </button>
      </div>
      
      {/* Color picker */}
      {colorPicker.visible && (
        <div 
          className="color-picker"
          style={{ 
            position: 'absolute',
            left: `${colorPicker.x}px`, 
            top: `${colorPicker.y}px`,
            zIndex: 1000,
            display: 'flex',
            flexWrap: 'wrap',
            width: '220px',
            padding: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {colorPalette.map((color) => (
            <div
              key={color}
              className="color-swatch"
              style={{
                width: '20px',
                height: '20px',
                margin: '2px',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: color,
                border: color === '#ffffff' ? '1px solid #ddd' : 'none'
              }}
              onClick={() => applyColor(color)}
              title={color}
            />
          ))}
          <button 
            onClick={() => setColorPicker({ visible: false, type: null, x: 0, y: 0 })}
            style={{ width: '100%', marginTop: '8px' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default Toolbar