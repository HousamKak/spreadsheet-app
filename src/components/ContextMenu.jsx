import { useEffect, useRef } from 'react'
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations'

/**
 * ContextMenu component for right-click operations
 */
function ContextMenu({ x, y, setVisible }) {
  const menuRef = useRef(null)
  const { 
    copySelectedCells, 
    cutSelectedCells, 
    pasteToCell, 
    clearSelectedCells,
    formatCells
  } = useSpreadsheetOperations()
  
  // Position the menu within viewport bounds
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let newX = x
      let newY = y
      
      if (x + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 5
      }
      
      if (y + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 5
      }
      
      menuRef.current.style.left = `${newX}px`
      menuRef.current.style.top = `${newY}px`
    }
  }, [x, y])
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setVisible(false)
      }
    }
    
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setVisible(false)
      }
    }
    
    // Add the event listeners
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyPress)
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [setVisible])
  
  // Handle menu item click
  const handleMenuItemClick = (action) => {
    switch (action) {
      case 'copy':
        copySelectedCells()
        break
      case 'cut':
        cutSelectedCells()
        break
      case 'paste':
        pasteToCell()
        break
      case 'clear':
        clearSelectedCells()
        break
      case 'bold':
        formatCells({ bold: true })
        break
      case 'italic':
        formatCells({ italic: true })
        break
      case 'underline':
        formatCells({ underline: true })
        break
      case 'align-left':
        formatCells({ align: 'left' })
        break
      case 'align-center':
        formatCells({ align: 'center' })
        break
      case 'align-right':
        formatCells({ align: 'right' })
        break
      default:
        break
    }
    
    // Close the menu after action
    setVisible(false)
  }
  
  // Define menu sections and items
  const menuSections = [
    {
      items: [
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', icon: 'copy' },
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', icon: 'cut' },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', icon: 'paste' },
        { id: 'clear', label: 'Clear contents', shortcut: 'Delete', icon: 'clear' }
      ]
    },
    {
      items: [
        { id: 'bold', label: 'Bold', shortcut: 'Ctrl+B', icon: 'bold' },
        { id: 'italic', label: 'Italic', shortcut: 'Ctrl+I', icon: 'italic' },
        { id: 'underline', label: 'Underline', shortcut: 'Ctrl+U', icon: 'underline' }
      ]
    },
    {
      items: [
        { id: 'align-left', label: 'Align left', icon: 'align-left' },
        { id: 'align-center', label: 'Align center', icon: 'align-center' },
        { id: 'align-right', label: 'Align right', icon: 'align-right' }
      ]
    }
  ]
  
  // SVG icons for context menu
  const getIcon = (iconName) => {
    const iconSize = 16
    const iconColor = 'currentColor'
    
    switch (iconName) {
      case 'copy':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
          </svg>
        )
      case 'cut':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
            <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
            <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
          </svg>
        )
      case 'paste':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        )
      case 'clear':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        )
      case 'bold':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
          </svg>
        )
      case 'italic':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        )
      case 'underline':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"></path>
            <line x1="4" y1="21" x2="20" y2="21"></line>
          </svg>
        )
      case 'align-left':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="21" y1="14" x2="3" y2="14"></line>
            <line x1="17" y1="18" x2="3" y2="18"></line>
          </svg>
        )
      case 'align-center':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="10" x2="6" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="21" y1="14" x2="3" y2="14"></line>
            <line x1="18" y1="18" x2="6" y2="18"></line>
          </svg>
        )
      case 'align-right':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="7" y2="10"></line>
            <line x1="21" y1="6" x2="3" y2="6"></line>
            <line x1="21" y1="14" x2="3" y2="14"></line>
            <line x1="21" y1="18" x2="7" y2="18"></line>
          </svg>
        )
      default:
        return null
    }
  }
  
  return (
    <div className="context-menu" ref={menuRef}>
      {menuSections.map((section, sectionIndex) => (
        <div key={`section-${sectionIndex}`}>
          {section.items.map((item) => (
            <div 
              key={item.id} 
              className="context-menu-item"
              onClick={() => handleMenuItemClick(item.id)}
            >
              <div style={{ width: '24px', height: '16px', display: 'flex', alignItems: 'center', marginRight: '8px', color: 'var(--text-secondary)' }}>
                {getIcon(item.icon)}
              </div>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  opacity: 0.7, 
                  marginLeft: '16px',
                  color: 'var(--text-secondary)'
                }}>
                  {item.shortcut}
                </span>
              )}
            </div>
          ))}
          {sectionIndex < menuSections.length - 1 && (
            <div className="context-menu-divider" />
          )}
        </div>
      ))}
    </div>
  )
}

export default ContextMenu