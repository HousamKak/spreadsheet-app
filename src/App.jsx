import { useState, useEffect } from 'react'
import { SpreadsheetProvider } from './context/SpreadsheetContext'
import FormulaBar from './components/FormulaBar'
import CanvasGrid from './components/CanvasGrid'
import SheetTabs from './components/SheetTabs'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import ContextMenu from './components/ContextMenu'
import Chart from './components/Chart'
import './styles/index.css'

function App() {
  const [theme, setTheme] = useState('light')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [chartData, setChartData] = useState(null)
  
  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('spreadsheet-theme', newTheme)
  }

  // Initialize theme on first render
  useEffect(() => {
    // Try to get saved theme from localStorage
    const savedTheme = localStorage.getItem('spreadsheet-theme')
    if (savedTheme) {
      setTheme(savedTheme)
      document.body.setAttribute('data-theme', savedTheme)
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Use system preference if no saved theme
      setTheme('dark')
      document.body.setAttribute('data-theme', 'dark')
    }
    
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0 })
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu.visible])

  // Close chart when escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && chartData) {
        setChartData(null)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [chartData])

  // Moon and sun icons for theme toggle
  const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  )
  
  const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  )
  
  // Handle chart close
  const handleChartClose = () => {
    setChartData(null)
  }

  return (
    <div className="app">
      <SpreadsheetProvider>
        <header className="app-header">
          <h1>Spreadsheet</h1>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            <span style={{ marginLeft: '8px' }}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </header>
        
        {isLoading ? (
          <div className="loading-container" style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div className="loading-indicator">Loading spreadsheet...</div>
          </div>
        ) : (
          <div className="spreadsheet-container">
            <Toolbar onCreateChart={(data) => setChartData(data)} />
            <FormulaBar />
            
            <div className="main-content">
              {chartData && (
                <div className="chart-overlay">
                  <Chart 
                    type={chartData.type} 
                    data={chartData.data} 
                    options={chartData.options} 
                    onClose={handleChartClose} 
                  />
                </div>
              )}
              <CanvasGrid setContextMenu={setContextMenu} />
            </div>
            
            <StatusBar />
            <SheetTabs />
          </div>
        )}
        
        {contextMenu.visible && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            setVisible={(visible) => setContextMenu({...contextMenu, visible})} 
          />
        )}
      </SpreadsheetProvider>
    </div>
  )
}

export default App