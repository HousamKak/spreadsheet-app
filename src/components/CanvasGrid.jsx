import { useRef, useEffect, useState, useCallback } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations';
import { getCellId, getColumnId, getCellIndices } from '../utils/cellHelpers';

/**
 * Canvas-based grid renderer for high-performance spreadsheet
 * Fixed positioning and selection issues
 */
function CanvasGrid({ setContextMenu }) {
  // Create separate canvases for different layers to prevent flickering
  const gridCanvasRef = useRef(null);    // For the grid lines and headers (static)
  const cellsCanvasRef = useRef(null);   // For the cell contents (dynamic)
  const overlayCanvasRef = useRef(null); // For selection highlights and focus indicators (dynamic)
  
  const containerRef = useRef(null);
  const { state, getColumnWidth, getRowHeight, getCellData } = useSpreadsheet();
  const { 
    setActiveCell, 
    selectCells,
    updateCellValue,
    navigateWithKeyboard
  } = useSpreadsheetOperations();
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [editCellId, setEditCellId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Performance metrics for debugging
  const [fpsCounter, setFpsCounter] = useState(0);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  
  // Constants
  const ROW_HEADER_WIDTH = 40;
  const COLUMN_HEADER_HEIGHT = 28;
  const DEFAULT_CELL_WIDTH = 100;
  const DEFAULT_CELL_HEIGHT = 26;
  
  // Cache and state tracking variables
  const renderInfoRef = useRef({
    gridNeedsRedraw: true,
    cellsNeedsRedraw: true,
    overlayNeedsRedraw: true,
    lastVisibleRange: null,
    cellPositions: new Map(), // Maps cellId -> {x, y, width, height}
    initialized: false
  });
  
  // Get active sheet
  const activeSheet = state.sheets.find(sheet => sheet.id === state.activeSheetId) || {
    maxCol: 50,
    maxRow: 100,
    cells: {},
    columnWidths: {},
    rowHeights: {}
  };
  
  // Calculate the total grid dimensions
  const getTotalWidth = useCallback(() => {
    let width = ROW_HEADER_WIDTH;
    for (let col = 0; col < activeSheet.maxCol; col++) {
      width += getColumnWidth(col);
    }
    return width;
  }, [activeSheet.maxCol, getColumnWidth]);
  
  const getTotalHeight = useCallback(() => {
    let height = COLUMN_HEADER_HEIGHT;
    for (let row = 0; row < activeSheet.maxRow; row++) {
      height += getRowHeight(row);
    }
    return height;
  }, [activeSheet.maxRow, getRowHeight]);
  
  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    if (!containerRef.current) return null;
    
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
    
    // Find visible columns
    let startCol = 0;
    let endCol = 0;
    let xPos = ROW_HEADER_WIDTH;
    
    while (startCol < activeSheet.maxCol && xPos + getColumnWidth(startCol) <= scrollLeft) {
      xPos += getColumnWidth(startCol);
      startCol++;
    }
    
    xPos = ROW_HEADER_WIDTH;
    endCol = startCol;
    while (endCol < activeSheet.maxCol && xPos <= scrollLeft + clientWidth) {
      xPos += getColumnWidth(endCol);
      endCol++;
    }
    
    // Find visible rows
    let startRow = 0;
    let endRow = 0;
    let yPos = COLUMN_HEADER_HEIGHT;
    
    while (startRow < activeSheet.maxRow && yPos + getRowHeight(startRow) <= scrollTop) {
      yPos += getRowHeight(startRow);
      startRow++;
    }
    
    yPos = COLUMN_HEADER_HEIGHT;
    endRow = startRow;
    while (endRow < activeSheet.maxRow && yPos <= scrollTop + clientHeight) {
      yPos += getRowHeight(endRow);
      endRow++;
    }
    
    // Add buffer for smooth scrolling
    startCol = Math.max(0, startCol - 1);
    startRow = Math.max(0, startRow - 1);
    endCol = Math.min(activeSheet.maxCol - 1, endCol + 1);
    endRow = Math.min(activeSheet.maxRow - 1, endRow + 1);
    
    return { startCol, endCol, startRow, endRow };
  }, [activeSheet.maxCol, activeSheet.maxRow, getColumnWidth, getRowHeight]);
  
  // Get cell position and dimensions
  const getCellPosition = useCallback((col, row) => {
    const cellId = getCellId(col, row);
    
    // Check if we've already calculated this cell's position
    if (renderInfoRef.current.cellPositions.has(cellId)) {
      return renderInfoRef.current.cellPositions.get(cellId);
    }
    
    // Calculate x position
    let x = ROW_HEADER_WIDTH;
    for (let c = 0; c < col; c++) {
      x += getColumnWidth(c);
    }
    
    // Calculate y position
    let y = COLUMN_HEADER_HEIGHT;
    for (let r = 0; r < row; r++) {
      y += getRowHeight(r);
    }
    
    const width = getColumnWidth(col);
    const height = getRowHeight(row);
    
    const position = { x, y, width, height };
    renderInfoRef.current.cellPositions.set(cellId, position);
    
    return position;
  }, [getColumnWidth, getRowHeight]);
  
  // Get cell ID at position - FIXED
  const getCellIdAtPosition = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return null;
    
    // Get the container's position and scroll position
    const rect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    // Convert client coordinates to grid coordinates
    const x = clientX - rect.left + scrollLeft;
    const y = clientY - rect.top + scrollTop;
    
    // Ignore if clicking on headers
    if (x < ROW_HEADER_WIDTH || y < COLUMN_HEADER_HEIGHT) {
      return null;
    }
    
    // Find column
    let col = 0;
    let colX = ROW_HEADER_WIDTH;
    
    while (col < activeSheet.maxCol) {
      const width = getColumnWidth(col);
      if (x >= colX && x < colX + width) {
        break;
      }
      colX += width;
      col++;
    }
    
    if (col >= activeSheet.maxCol) return null;
    
    // Find row
    let row = 0;
    let rowY = COLUMN_HEADER_HEIGHT;
    
    while (row < activeSheet.maxRow) {
      const height = getRowHeight(row);
      if (y >= rowY && y < rowY + height) {
        break;
      }
      rowY += height;
      row++;
    }
    
    if (row >= activeSheet.maxRow) return null;
    
    return getCellId(col, row);
  }, [activeSheet.maxCol, activeSheet.maxRow, getColumnWidth, getRowHeight]);
  
  // Draw the static grid (lines and headers)
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Non-alpha for better performance
    if (!ctx) return;
    
    // Only draw grid if it needs redraw
    if (!renderInfoRef.current.gridNeedsRedraw) return;
    
    // Check if we're in dark mode
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    // Get theme colors - use directly for better performance
    const bgColor = isDarkMode ? '#202124' : '#ffffff';
    const headerBgColor = isDarkMode ? '#2d2e30' : '#f8f9fa';
    const textColor = isDarkMode ? '#e8eaed' : '#202124';
    
    // Use more visible grid lines in dark mode
    const gridLineColor = isDarkMode ? '#3c4043' : '#e0e0e0';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get visible range
    const visibleRange = getVisibleRange();
    if (!visibleRange) return;
    
    const { startCol, endCol, startRow, endRow } = visibleRange;
    
    // Set up text rendering with better legibility
    ctx.textBaseline = 'middle';
    ctx.font = isDarkMode 
      ? '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'  // Bolder in dark mode
      : '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    // Get container scroll position
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Draw grid background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw row headers area (fixed left column)
    ctx.fillStyle = headerBgColor;
    ctx.fillRect(0, 0, ROW_HEADER_WIDTH, canvas.height);
    
    // Draw column headers area (fixed top row)
    ctx.fillRect(0, 0, canvas.width, COLUMN_HEADER_HEIGHT);
    
    // Draw corner header
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = isDarkMode ? 1.5 : 1; // Slightly thicker lines in dark mode
    ctx.strokeRect(0, 0, ROW_HEADER_WIDTH, COLUMN_HEADER_HEIGHT);
    
    // Draw visible grid lines - rows
    ctx.beginPath();
    for (let row = startRow; row <= endRow + 1; row++) {
      const { y } = getCellPosition(0, row);
      const adjustedY = y - scrollTop;
      
      ctx.moveTo(0, adjustedY);
      ctx.lineTo(canvas.width, adjustedY);
    }
    
    // Draw visible grid lines - columns
    for (let col = startCol; col <= endCol + 1; col++) {
      const { x } = getCellPosition(col, 0);
      const adjustedX = x - scrollLeft;
      
      ctx.moveTo(adjustedX, 0);
      ctx.lineTo(adjustedX, canvas.height);
    }
    
    ctx.strokeStyle = gridLineColor;
    ctx.stroke();
    
    // Draw column headers
    for (let col = startCol; col <= endCol; col++) {
      const { x, width } = getCellPosition(col, 0);
      const adjustedX = x - scrollLeft;
      
      // Skip if outside viewport
      if (adjustedX + width < 0 || adjustedX > canvas.width) continue;
      
      // Draw column label with better contrast
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      // Apply a subtle shadow in dark mode for better readability
      if (isDarkMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
      }
      
      ctx.fillText(getColumnId(col), adjustedX + width / 2, COLUMN_HEADER_HEIGHT / 2);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    // Draw row headers
    for (let row = startRow; row <= endRow; row++) {
      const { y, height } = getCellPosition(0, row);
      const adjustedY = y - scrollTop;
      
      // Skip if outside viewport
      if (adjustedY + height < 0 || adjustedY > canvas.height) continue;
      
      // Draw row label with better contrast
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      // Apply a subtle shadow in dark mode for better readability
      if (isDarkMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
      }
      
      ctx.fillText((row + 1).toString(), ROW_HEADER_WIDTH / 2, adjustedY + height / 2);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    renderInfoRef.current.gridNeedsRedraw = false;
  }, [getVisibleRange, getCellPosition, activeSheet.maxCol, activeSheet.maxRow, getColumnWidth, getRowHeight]);
  
  // Draw the cell contents
  const drawCells = useCallback(() => {
    const canvas = cellsCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Only draw cells if they need redraw
    if (!renderInfoRef.current.cellsNeedsRedraw) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get theme colors
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e8eaed' : '#202124';
    
    // Get visible range
    const visibleRange = getVisibleRange();
    if (!visibleRange) return;
    
    const { startCol, endCol, startRow, endRow } = visibleRange;
    
    // Get container scroll position
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Draw visible cells
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellId = getCellId(col, row);
        const cellData = getCellData(cellId);
        const { x, y, width, height } = getCellPosition(col, row);
        
        const adjustedX = x - scrollLeft;
        const adjustedY = y - scrollTop;
        
        // Skip if outside viewport
        if (adjustedX + width < 0 || adjustedX > canvas.width || 
            adjustedY + height < 0 || adjustedY > canvas.height) continue;
        
        // Draw cell background (but only if it has a custom background color)
        if (cellData.bgColor) {
          ctx.fillStyle = cellData.bgColor;
          ctx.fillRect(adjustedX, adjustedY, width, height);
        }
        
        // Draw cell content
        if (cellData.value) {
          // Apply text formatting
          ctx.fillStyle = cellData.textColor || textColor;
          
          // Set font with formatting
          let fontStyle = '';
          if (cellData.bold) fontStyle += 'bold ';
          if (cellData.italic) fontStyle += 'italic ';
          ctx.font = `${fontStyle}14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          
          // Apply text alignment
          if (cellData.align === 'center') {
            ctx.textAlign = 'center';
            ctx.fillText(cellData.value.toString(), adjustedX + width / 2, adjustedY + height / 2, width - 8);
          } else if (cellData.align === 'right') {
            ctx.textAlign = 'right';
            ctx.fillText(cellData.value.toString(), adjustedX + width - 4, adjustedY + height / 2, width - 8);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(cellData.value.toString(), adjustedX + 4, adjustedY + height / 2, width - 8);
          }
        }
      }
    }
    
    renderInfoRef.current.cellsNeedsRedraw = false;
  }, [getVisibleRange, getCellPosition, getCellData]);
  
  // Draw selection overlay - FIXED
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Only draw overlay if it needs redraw
    if (!renderInfoRef.current.overlayNeedsRedraw) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get theme colors based on dark/light mode
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    // Use more visible selection colors based on theme
    const selectedColor = isDarkMode 
      ? 'rgba(100, 130, 180, 0.5)'  // More visible blue in dark mode
      : 'rgba(200, 230, 255, 0.6)'; // Light blue for light mode
      
    const focusColor = isDarkMode
      ? '#6ab7ff' // Brighter blue for dark mode
      : '#1a73e8'; // Standard blue for light mode
      
    const headerSelectedColor = isDarkMode
      ? 'rgba(120, 140, 190, 0.7)' // More visible for dark mode
      : 'rgba(180, 210, 250, 0.8)'; // Standard for light mode
    
    // Get container scroll position
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Highlight selected cells
    if (state.selectedCells.length > 0) {
      // Track selected rows and columns for header highlighting
      const selectedRows = new Set();
      const selectedCols = new Set();
      
      // Draw each selected cell with appropriate opacity
      ctx.fillStyle = selectedColor;
      
      state.selectedCells.forEach(cellId => {
        const [col, row] = getCellIndices(cellId);
        const { x, y, width, height } = getCellPosition(col, row);
        
        // Adjust for scroll position
        const adjustedX = x - scrollLeft;
        const adjustedY = y - scrollTop;
        
        // Track row and column
        selectedRows.add(row);
        selectedCols.add(col);
        
        // Draw selection rectangle
        ctx.beginPath();
        ctx.rect(adjustedX, adjustedY, width, height);
        ctx.fill();
      });
      
      // Highlight row headers for selected rows
      ctx.fillStyle = headerSelectedColor;
      selectedRows.forEach(row => {
        const { y, height } = getCellPosition(0, row);
        const adjustedY = y - scrollTop;
        
        ctx.beginPath();
        ctx.rect(0, adjustedY, ROW_HEADER_WIDTH, height);
        ctx.fill();
      });
      
      // Highlight column headers for selected columns
      selectedCols.forEach(col => {
        const { x, width } = getCellPosition(col, 0);
        const adjustedX = x - scrollLeft;
        
        ctx.beginPath();
        ctx.rect(adjustedX, 0, width, COLUMN_HEADER_HEIGHT);
        ctx.fill();
      });
    }
    
    // Draw focus indicator on active cell
    if (state.activeCell) {
      const [col, row] = getCellIndices(state.activeCell);
      const { x, y, width, height } = getCellPosition(col, row);
      
      const adjustedX = x - scrollLeft;
      const adjustedY = y - scrollTop;
      
      // Draw focus border with a more prominent look
      ctx.strokeStyle = focusColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(adjustedX, adjustedY, width, height);
    }
    
    renderInfoRef.current.overlayNeedsRedraw = false;
    
    // Update FPS counter
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFrameTimeRef.current >= 1000) {
      setFpsCounter(frameCountRef.current);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, [state.selectedCells, state.activeCell, getCellPosition]);
  
  // Main render function that coordinates all drawing
  const render = useCallback(() => {
    if (
      !containerRef.current || 
      !gridCanvasRef.current || 
      !cellsCanvasRef.current || 
      !overlayCanvasRef.current
    ) return;
    
    // Resize canvases if needed
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth !== canvasSize.width || clientHeight !== canvasSize.height) {
      setCanvasSize({ width: clientWidth, height: clientHeight });
      renderInfoRef.current.gridNeedsRedraw = true;
      renderInfoRef.current.cellsNeedsRedraw = true;
      renderInfoRef.current.overlayNeedsRedraw = true;
    }
    
    // Draw all layers in correct order
    drawGrid();    // Static grid lines and headers
    drawCells();   // Cell contents
    drawOverlay(); // Selection and focus indicators
    
    // Request next frame if needed
    if (!renderInfoRef.current.initialized || 
        renderInfoRef.current.gridNeedsRedraw || 
        renderInfoRef.current.cellsNeedsRedraw || 
        renderInfoRef.current.overlayNeedsRedraw) {
      requestAnimationFrame(render);
    }
    
    renderInfoRef.current.initialized = true;
  }, [drawGrid, drawCells, drawOverlay, canvasSize]);
  
  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    setScrollPosition({
      x: container.scrollLeft,
      y: container.scrollTop
    });
    
    // Mark all layers for redraw on scroll
    renderInfoRef.current.gridNeedsRedraw = true;
    renderInfoRef.current.cellsNeedsRedraw = true;
    renderInfoRef.current.overlayNeedsRedraw = true;
    
    // Request animation frame for smooth scrolling
    requestAnimationFrame(render);
  }, [render]);
  
  // Handle mouse down for selection - FIXED
  const handleMouseDown = useCallback((e) => {
    if (isEditing) return;
    
    const cellId = getCellIdAtPosition(e.clientX, e.clientY);
    if (!cellId) return;
    
    // Start selection
    setSelectionStart(cellId);
    setIsSelecting(true);
    
    // Set active cell
    setActiveCell(cellId);
    
    // Select single cell
    selectCells([cellId]);
    
    // Mark overlay for redraw
    renderInfoRef.current.overlayNeedsRedraw = true;
    requestAnimationFrame(render);
  }, [isEditing, getCellIdAtPosition, setActiveCell, selectCells, render]);
  
  // Handle mouse move for selection
  const handleMouseMove = useCallback((e) => {
    if (!isSelecting || !selectionStart) return;
    
    const cellId = getCellIdAtPosition(e.clientX, e.clientY);
    if (!cellId) return;
    
    // Calculate selection range
    const [startCol, startRow] = getCellIndices(selectionStart);
    const [endCol, endRow] = getCellIndices(cellId);
    
    // Generate all cells in selection range
    const cells = [];
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push(getCellId(col, row));
      }
    }
    
    // Update selection
    selectCells(cells);
    
    // Mark overlay for redraw
    renderInfoRef.current.overlayNeedsRedraw = true;
    requestAnimationFrame(render);
  }, [isSelecting, selectionStart, getCellIdAtPosition, selectCells, render]);
  
  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);
  
  // Handle double click to edit cell - FIXED
  const handleDoubleClick = useCallback((e) => {
    const cellId = getCellIdAtPosition(e.clientX, e.clientY);
    if (!cellId) return;
    
    // Get cell data
    const cellData = getCellData(cellId);
    const [col, row] = getCellIndices(cellId);
    const cellPosition = getCellPosition(col, row);
    
    const container = containerRef.current;
    if (!container) return;
    
    // Set up editing with corrected position calculation
    setIsEditing(true);
    setEditCellId(cellId);
    setEditValue(cellData.formula || cellData.value || '');
    
    // Calculate position relative to the visible viewport
    const rect = container.getBoundingClientRect();
    
    setEditPosition({
      x: cellPosition.x - container.scrollLeft + rect.left,
      y: cellPosition.y - container.scrollTop + rect.top,
      width: cellPosition.width,
      height: cellPosition.height
    });
  }, [getCellIdAtPosition, getCellData, getCellPosition, getCellIndices]);
  
  // Handle keyboard events - FIXED
  const handleKeyDown = useCallback((e) => {
    if (isEditing) return;
    
    // Skip if event isn't from canvas container
    if (e.target !== containerRef.current) return;
    
    // Handle navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
      
      if (!state.activeCell) return;
      
      const direction = e.key === 'Tab' 
        ? (e.shiftKey ? 'left' : 'right') 
        : e.key === 'Enter'
          ? 'down'
          : e.key.replace('Arrow', '').toLowerCase();
      
      const nextCellId = navigateWithKeyboard(direction, state.activeCell);
      if (nextCellId) {
        setActiveCell(nextCellId);
        selectCells([nextCellId]);
        
        // Ensure cell is visible (auto-scroll)
        const [col, row] = getCellIndices(nextCellId);
        const { x, y, width, height } = getCellPosition(col, row);
        const container = containerRef.current;
        
        if (x < container.scrollLeft) {
          container.scrollLeft = x;
        } else if (x + width > container.scrollLeft + container.clientWidth) {
          container.scrollLeft = x + width - container.clientWidth;
        }
        
        if (y < container.scrollTop) {
          container.scrollTop = y;
        } else if (y + height > container.scrollTop + container.clientHeight) {
          container.scrollTop = y + height - container.clientHeight;
        }
        
        // Mark overlay for redraw
        renderInfoRef.current.overlayNeedsRedraw = true;
        requestAnimationFrame(render);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Clear selected cells
      state.selectedCells.forEach(cellId => {
        updateCellValue(cellId, '');
      });
      
      // Mark cells for redraw
      renderInfoRef.current.cellsNeedsRedraw = true;
      requestAnimationFrame(render);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start editing with the pressed key
      if (!state.activeCell) return;
      
      const [col, row] = getCellIndices(state.activeCell);
      const cellPosition = getCellPosition(col, row);
      const container = containerRef.current;
      
      // Get container position
      const rect = container.getBoundingClientRect();
      
      // Set up editing with corrected position calculation
      setIsEditing(true);
      setEditCellId(state.activeCell);
      setEditValue(e.key); // Just set the initial key value
      
      // Properly position the editor
      setEditPosition({
        x: cellPosition.x - container.scrollLeft + rect.left,
        y: cellPosition.y - container.scrollTop + rect.top,
        width: cellPosition.width,
        height: cellPosition.height
      });
    }
  }, [
    isEditing, 
    state.activeCell, 
    state.selectedCells, 
    navigateWithKeyboard, 
    setActiveCell, 
    selectCells, 
    getCellPosition,
    updateCellValue,
    render
  ]);
  
  // Handle edit field changes - FIXED to prevent duplication
  const handleEditChange = useCallback((e) => {
    // Use the event's target value directly to avoid state inconsistencies
    setEditValue(e.target.value);
  }, []);
  
  // Handle edit field key presses - FIXED
  const handleEditKeyDown = useCallback((e) => {
    // Stop propagation to prevent double handling of key events
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      // Finish editing
      e.preventDefault();
      
      if (editCellId) {
        updateCellValue(editCellId, editValue);
        setIsEditing(false);
        
        // Move to cell below
        const nextCellId = navigateWithKeyboard('down', editCellId);
        if (nextCellId) {
          setActiveCell(nextCellId);
          selectCells([nextCellId]);
        }
        
        // Mark layers for redraw
        renderInfoRef.current.cellsNeedsRedraw = true;
        renderInfoRef.current.overlayNeedsRedraw = true;
        requestAnimationFrame(render);
      }
    } else if (e.key === 'Escape') {
      // Cancel editing
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      // Finish editing and move to next cell
      e.preventDefault();
      
      if (editCellId) {
        updateCellValue(editCellId, editValue);
        setIsEditing(false);
        
        // Move to next cell
        const direction = e.shiftKey ? 'left' : 'right';
        const nextCellId = navigateWithKeyboard(direction, editCellId);
        if (nextCellId) {
          setActiveCell(nextCellId);
          selectCells([nextCellId]);
        }
        
        // Mark layers for redraw
        renderInfoRef.current.cellsNeedsRedraw = true;
        renderInfoRef.current.overlayNeedsRedraw = true;
        requestAnimationFrame(render);
      }
    }
  }, [editCellId, editValue, updateCellValue, navigateWithKeyboard, setActiveCell, selectCells, render]);
  
  // Handle edit field blur
  const handleEditBlur = useCallback(() => {
    if (editCellId) {
      updateCellValue(editCellId, editValue);
      setIsEditing(false);
      
      // Mark cells for redraw
      renderInfoRef.current.cellsNeedsRedraw = true;
      requestAnimationFrame(render);
    }
  }, [editCellId, editValue, updateCellValue, render]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    });
  }, [setContextMenu]);
  
  // Initialize and resize canvases - FIXED
  useEffect(() => {
    const resizeCanvases = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const { clientWidth, clientHeight } = container;
      
      // Get device pixel ratio for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      
      // Set all canvas dimensions with the right physical pixel scaling
      [gridCanvasRef, cellsCanvasRef, overlayCanvasRef].forEach(canvasRef => {
        if (!canvasRef.current) return;
        
        // Set the actual size in memory
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
        
        // Set the display size
        canvasRef.current.style.width = `${clientWidth}px`;
        canvasRef.current.style.height = `${clientHeight}px`;
        
        // Scale all drawing operations by the dpr
        const ctx = canvasRef.current.getContext('2d');
        ctx.scale(dpr, dpr);
      });
      
      setCanvasSize({ width: clientWidth, height: clientHeight });
      
      // Mark all layers for redraw
      renderInfoRef.current.gridNeedsRedraw = true;
      renderInfoRef.current.cellsNeedsRedraw = true;
      renderInfoRef.current.overlayNeedsRedraw = true;
      
      // Clear cell position cache when resizing
      renderInfoRef.current.cellPositions.clear();
      
      // Trigger render
      requestAnimationFrame(render);
    };
    
    // Initial resize
    resizeCanvases();
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvases);
    
    return () => {
      window.removeEventListener('resize', resizeCanvases);
    };
  }, [render]);
  
  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
  
  // Force redraw when selection or active cell changes
  useEffect(() => {
    renderInfoRef.current.overlayNeedsRedraw = true;
    requestAnimationFrame(render);
  }, [state.selectedCells, state.activeCell, render]);
  
  // Force redraw when cell data changes
  useEffect(() => {
    renderInfoRef.current.cellsNeedsRedraw = true;
    requestAnimationFrame(render);
  }, [activeSheet.cells, render]);
  
  // Focus the container on mount to enable keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.focus();
    }
    
    // Initial render
    requestAnimationFrame(render);
  }, [render]);
  
  return (
    <div className="canvas-grid-container" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div 
        ref={containerRef}
        className="canvas-scroll-container"
        style={{ 
          width: '100%', 
          height: '100%', 
          overflow: 'auto',
          outline: 'none',
          position: 'relative' // Added for proper positioning context
        }}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        data-mode={isSelecting ? "selecting" : "default"}
      >
        <div 
          style={{ 
            width: getTotalWidth(), 
            height: getTotalHeight(),
            position: 'relative'
          }}
        >
          {/* Canvas layers with absolute positioning instead of sticky */}
          <canvas
            ref={gridCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          <canvas
            ref={cellsCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
          <canvas
            ref={overlayCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 3
            }}
          />
        </div>
      </div>
      
      {/* Cell editor - FIXED */}
      {isEditing && (
        <div className="cell-editor-container" style={{
          position: 'absolute',
          left: `${editPosition.x}px`,
          top: `${editPosition.y}px`,
          width: `${editPosition.width}px`,
          height: `${editPosition.height}px`,
          zIndex: 20,
          boxShadow: '0 0 0 2px var(--primary-color)',
          backgroundColor: 'var(--bg-color)',
          overflow: 'visible'
        }}>
          <input
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            className="cell-editor"
            style={{
              width: '100%',
              height: '100%',
              padding: '1px 3px',
              border: 'none',
              outline: 'none',
              font: 'inherit',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)',
              caretColor: 'var(--primary-color)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '13px',
              lineHeight: '21px'
            }}
            onSelect={(e) => {
              e.target.style.userSelect = 'text';
              e.target.style.webkitUserSelect = 'text';
            }}
            autoFocus
            // Focus and position cursor at the end of the text
            ref={(input) => {
              if (input) {
                input.focus();
                const length = input.value.length;
                input.setSelectionRange(length, length);
              }
            }}
          />
        </div>
      )}
      
      {/* Performance metrics */}
      <div className="performance-stats">
        FPS: {fpsCounter} | Cells: {state.selectedCells.length}
      </div>
    </div>
  );
}

export default CanvasGrid;