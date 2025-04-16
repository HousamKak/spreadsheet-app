import { useState } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations'

/**
 * SheetTabs component for navigating between sheets
 */
function SheetTabs() {
  const { state } = useSpreadsheet()
  const { addSheet, deleteSheet, renameSheet, switchSheet } = useSpreadsheetOperations()
  const [editingSheet, setEditingSheet] = useState(null)
  const [newName, setNewName] = useState('')
  
  // Handle sheet click
  const handleSheetClick = (sheetId) => {
    if (sheetId !== state.activeSheetId) {
      switchSheet(sheetId)
    }
  }
  
  // Handle starting sheet rename
  const handleRenameStart = (e, sheet) => {
    e.stopPropagation()
    setEditingSheet(sheet.id)
    setNewName(sheet.name)
  }
  
  // Handle sheet rename change
  const handleRenameChange = (e) => {
    setNewName(e.target.value)
  }
  
  // Handle confirming sheet rename
  const handleRenameConfirm = (e) => {
    if (e.key === 'Enter') {
      if (newName.trim()) {
        renameSheet(editingSheet, newName)
      }
      setEditingSheet(null)
    } else if (e.key === 'Escape') {
      setEditingSheet(null)
    }
  }
  
  // Handle renaming on blur
  const handleRenameBlur = () => {
    if (editingSheet && newName.trim()) {
      renameSheet(editingSheet, newName)
    }
    setEditingSheet(null)
  }
  
  // Handle sheet deletion
  const handleDeleteSheet = (e, sheetId) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this sheet?')) {
      deleteSheet(sheetId)
    }
  }
  
  // Create sheet tab with indicator
  const SheetTab = ({ sheet }) => {
    const isActive = sheet.id === state.activeSheetId
    
    return (
      <div 
        className={`sheet-tab ${isActive ? 'active' : ''}`}
        onClick={() => handleSheetClick(sheet.id)}
      >
        {editingSheet === sheet.id ? (
          <input
            type="text"
            value={newName}
            onChange={handleRenameChange}
            onKeyDown={handleRenameConfirm}
            onBlur={handleRenameBlur}
            autoFocus
            style={{ 
              width: '100px',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-color)'
            }}
          />
        ) : (
          <>
            <span 
              onDoubleClick={(e) => handleRenameStart(e, sheet)}
              style={{ 
                userSelect: 'none',
                marginRight: '8px', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px'
              }}
            >
              {sheet.name}
            </span>
            {state.sheets.length > 1 && (
              <button 
                onClick={(e) => handleDeleteSheet(e, sheet.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                  color: 'var(--text-secondary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  transition: 'background-color 0.2s'
                }}
                title="Delete sheet"
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    )
  }
  
  return (
    <div className="sheet-tabs">
      {state.sheets.map((sheet) => (
        <SheetTab key={sheet.id} sheet={sheet} />
      ))}
      
      <button 
        className="add-sheet-btn" 
        onClick={addSheet}
        title="Add sheet"
      >
        +
      </button>
    </div>
  )
}

export default SheetTabs