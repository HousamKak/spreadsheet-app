import { useRef, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations'

/**
 * FormulaBar component for displaying and editing cell formulas
 */
function FormulaBar() {
  const { state } = useSpreadsheet()
  const { updateFormulaBarValue, applyFormulaBar } = useSpreadsheetOperations()
  const inputRef = useRef(null)
  
  // Focus input when active cell changes
  useEffect(() => {
    if (state.activeCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [state.activeCell])
  
  // Handle input value change
  const handleChange = (e) => {
    updateFormulaBarValue(e.target.value)
  }
  
  // Handle key down events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      applyFormulaBar()
    }
  }
  
  // Handle input blur
  const handleBlur = () => {
    applyFormulaBar()
  }
  
  // Function icon for the formula bar
  const FunctionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: 'var(--text-secondary)' }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  )
  
  return (
    <div className="formula-bar">
      <div className="cell-address">
        {state.activeCell || ''}
      </div>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          flex: 1, 
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          backgroundColor: 'var(--bg-color)',
          padding: '0 8px',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <FunctionIcon />
        <input
          ref={inputRef}
          type="text"
          className="formula-input"
          value={state.formulaBarValue || ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Enter a value or formula (start with =)..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '8px 0',
            backgroundColor: 'transparent',
            color: 'var(--text-color)',
            fontSize: '14px'
          }}
        />
      </div>
    </div>
  )
}

export default FormulaBar