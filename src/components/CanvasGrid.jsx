// src/components/CanvasGrid.jsx - Complete fix
import { useRef, useEffect, useState, useCallback } from 'react';
import { useSpreadsheet } from '../context/SpreadsheetContext';
import useSpreadsheetOperations from '../hooks/useSpreadsheetOperations';
import { getCellId, getColumnId, getCellIndices } from '../utils/cellHelpers';

/**
 * Canvas-based grid renderer for high-performance spreadsheet
 * Completely overhauled to fix input and scrolling issues
 */
function CanvasGrid({ setContextMenu }) {
  // Canvas refs
  const gridCanvasRef = useRef(null);
  const cellsCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  
  // DOM element refs
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  
  // Context and operations
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
  const [fps, setFps] = useState(0);
  
  // Performance tracking refs
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const renderRequestRef = useRef(null);
  
  // Constants
  const ROW_HEADER_WIDTH = 40;
  const COLUMN_HEADER_HEIGHT = 28;
  
  // Render state tracking
  const renderInfoRef = useRef({
    gridNeedsRedraw: true,
    cellsNeedsRedraw: true,
    overlayNeedsRedraw: true,
    cellPositions: new Map(),
    initialized: false
  });
  
  // Get active sheet with fallback
  const activeSheet = state.sheets.find(sheet => sheet.id === state.activeSheetId) || {
    maxCol: 50,
    maxRow: 100,
    cells: {},
    columnWidths: {},
    rowHeights: {}
  };
  
  // Calculate total grid dimensions
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
  
  // Get visible range with generous buffer
  const getVisibleRange = useCallback(() => {
    if (!containerRef.current) return null;
    
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
    
    // Find start column with buffer
    let startCol = 0;
    let xPos = ROW_HEADER_WIDTH;
    while (startCol < activeSheet.maxCol && xPos + getColumnWidth(startCol) <= scrollLeft) {
      xPos += getColumnWidth(startCol);
      startCol++;
    }
    startCol = Math.max(0, startCol - 5); // Add buffer
    
    // Find end column with buffer
    xPos = ROW_HEADER_WIDTH;
    for (let col = 0; col < startCol; col++) {
      xPos += getColumnWidth(col);
    }
    
    let endCol = startCol;
    while (endCol < activeSheet.maxCol && xPos <= scrollLeft + clientWidth) {
      xPos += getColumnWidth(endCol);
      endCol++;
    }
    endCol = Math.min(activeSheet.maxCol - 1, endCol + 5); // Add buffer
    
    // Find start row with buffer
    let startRow = 0;
    let yPos = COLUMN_HEADER_HEIGHT;
    while (startRow < activeSheet.maxRow && yPos + getRowHeight(startRow) <= scrollTop) {
      yPos += getRowHeight(startRow);
      startRow++;
    }
    startRow = Math.max(0, startRow - 5); // Add buffer
    
    // Find end row with buffer
    yPos = COLUMN_HEADER_HEIGHT;
    for (let row = 0; row < startRow; row++) {
      yPos += getRowHeight(row);
    }
    
    let endRow = startRow;
    while (endRow < activeSheet.maxRow && yPos <= scrollTop + clientHeight) {
      yPos += getRowHeight(endRow);
      endRow++;
    }
    endRow = Math.min(activeSheet.maxRow - 1, endRow + 10); // Add larger buffer for rows
    
    return { startCol, endCol, startRow, endRow };
  }, [activeSheet.maxCol, activeSheet.maxRow, getColumnWidth, getRowHeight]);
  
  // Get cell position with caching
  const getCellPosition = useCallback((col, row) => {
    const cellId = getCellId(col, row);
    
    if (renderInfoRef.current.cellPositions.has(cellId)) {
      return renderInfoRef.current.cellPositions.get(cellId);
    }
    
    let x = ROW_HEADER_WIDTH;
    for (let c = 0; c < col; c++) {
      x += getColumnWidth(c);
    }
    
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
  
  // Get cell ID at position with improved accuracy
  const getCellIdAtPosition = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return null;
    
    const rect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    // Convert client coordinates to grid coordinates
    const x = clientX - rect.left + scrollLeft;
    const y = clientY - rect.top + scrollTop;
    
    // Skip if clicking on headers
    if (x < ROW_HEADER_WIDTH || y < COLUMN_HEADER_HEIGHT) {
      return null;
    }
    
    // Find column
    let col = 0;
    let xPos = ROW_HEADER_WIDTH;
    
    while (col < activeSheet.maxCol) {
      const width = getColumnWidth(col);
      if (x >= xPos && x < xPos + width) {
        break;
      }
      xPos += width;
      col++;
    }
    
    if (col >= activeSheet.maxCol) return null;
    
    // Find row
    let row = 0;
    let yPos = COLUMN_HEADER_HEIGHT;
    
    while (row < activeSheet.maxRow) {
      const height = getRowHeight(row);
      if (y >= yPos && y < yPos + height) {
        break;
      }
      yPos += height;
      row++;
    }
    
    if (row >= activeSheet.maxRow) return null;
    
    return getCellId(col, row);
  }, [activeSheet.maxCol, activeSheet.maxRow, getColumnWidth, getRowHeight]);
  
  // Draw the grid with headers
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    if (!renderInfoRef.current.gridNeedsRedraw) return;
    
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const bgColor = isDarkMode ? '#202124' : '#ffffff';
    const headerBgColor = isDarkMode ? '#2d2e30' : '#f8f9fa';
    const textColor = isDarkMode ? '#e8eaed' : '#202124';
    const gridLineColor = isDarkMode ? '#3c4043' : '#e0e0e0';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const visibleRange = getVisibleRange();
    if (!visibleRange) return;
    
    const { startCol, endCol, startRow, endRow } = visibleRange;
    
    ctx.textBaseline = 'middle';
    ctx.font = isDarkMode 
      ? '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw header backgrounds
    ctx.fillStyle = headerBgColor;
    ctx.fillRect(0, 0, ROW_HEADER_WIDTH, canvas.height);
    ctx.fillRect(0, 0, canvas.width, COLUMN_HEADER_HEIGHT);
    
    // Draw corner square
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = isDarkMode ? 1.5 : 1;
    ctx.strokeRect(0, 0, ROW_HEADER_WIDTH, COLUMN_HEADER_HEIGHT);
    
    // Draw grid lines
    ctx.beginPath();
    
    // Horizontal lines (rows)
    for (let row = startRow; row <= endRow + 1; row++) {
      const { y } = getCellPosition(0, row);
      const adjustedY = y - scrollTop;
      
      ctx.moveTo(0, adjustedY);
      ctx.lineTo(canvas.width, adjustedY);
    }
    
    // Vertical lines (columns)
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
      
      if (adjustedX + width < 0 || adjustedX > canvas.width) continue;
      
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      if (isDarkMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
      }
      
      ctx.fillText(getColumnId(col), adjustedX + width / 2, COLUMN_HEADER_HEIGHT / 2);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    // Draw row headers
    for (let row = startRow; row <= endRow; row++) {
      const { y, height } = getCellPosition(0, row);
      const adjustedY = y - scrollTop;
      
      if (adjustedY + height < 0 || adjustedY > canvas.height) continue;
      
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      if (isDarkMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
      }
      
      ctx.fillText((row + 1).toString(), ROW_HEADER_WIDTH / 2, adjustedY + height / 2);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    renderInfoRef.current.gridNeedsRedraw = false;
  }, [getVisibleRange, getCellPosition]);
  
  // Draw the cell contents
  const drawCells = useCallback(() => {
    const canvas = cellsCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!renderInfoRef.current.cellsNeedsRedraw) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e8eaed' : '#202124';
    
    const visibleRange = getVisibleRange();
    if (!visibleRange) return;
    
    const { startCol, endCol, startRow, endRow } = visibleRange;
    
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Clip to content area (exclude headers)
    ctx.save();
    ctx.rect(ROW_HEADER_WIDTH, COLUMN_HEADER_HEIGHT, 
             canvas.width - ROW_HEADER_WIDTH, 
             canvas.height - COLUMN_HEADER_HEIGHT);
    ctx.clip();
    
    // Draw visible cells
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellId = getCellId(col, row);
        const cellData = getCellData(cellId);
        const { x, y, width, height } = getCellPosition(col, row);
        
        const adjustedX = x - scrollLeft;
        const adjustedY = y - scrollTop;
        
        // Skip if outside viewport
        if (adjustedX + width < ROW_HEADER_WIDTH || adjustedX > canvas.width || 
            adjustedY + height < COLUMN_HEADER_HEIGHT || adjustedY > canvas.height) {
          continue;
        }
        
        // Draw background if custom
        if (cellData.bgColor) {
          ctx.fillStyle = cellData.bgColor;
          ctx.fillRect(adjustedX, adjustedY, width, height);
        }
        
        // Draw cell content if exists
        if (cellData.value !== undefined && cellData.value !== null && cellData.value !== '') {
          // Apply text styling
          ctx.fillStyle = cellData.textColor || textColor;
          
          // Font with formatting
          let fontStyle = '';
          if (cellData.bold) fontStyle += 'bold ';
          if (cellData.italic) fontStyle += 'italic ';
          ctx.font = `${fontStyle}14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          
          // Display value with alignment
          const displayValue = String(cellData.value);
          
          if (cellData.align === 'center') {
            ctx.textAlign = 'center';
            ctx.fillText(displayValue, adjustedX + width / 2, adjustedY + height / 2, width - 8);
          } else if (cellData.align === 'right') {
            ctx.textAlign = 'right';
            ctx.fillText(displayValue, adjustedX + width - 4, adjustedY + height / 2, width - 8);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(displayValue, adjustedX + 4, adjustedY + height / 2, width - 8);
          }
          
          // Underline if needed
          if (cellData.underline) {
            ctx.beginPath();
            
            const textWidth = ctx.measureText(displayValue).width;
            let lineX, lineWidth;
            
            if (cellData.align === 'center') {
              lineX = adjustedX + width / 2 - textWidth / 2;
              lineWidth = textWidth;
            } else if (cellData.align === 'right') {
              lineX = adjustedX + width - 4 - textWidth;
              lineWidth = textWidth;
            } else {
              lineX = adjustedX + 4;
              lineWidth = textWidth;
            }
            
            ctx.moveTo(lineX, adjustedY + height - 6);
            ctx.lineTo(lineX + lineWidth, adjustedY + height - 6);
            ctx.strokeStyle = cellData.textColor || textColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
    
    ctx.restore(); // Remove clipping
    
    renderInfoRef.current.cellsNeedsRedraw = false;
  }, [getVisibleRange, getCellPosition, getCellData]);
  
  // Draw selection overlay
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!renderInfoRef.current.overlayNeedsRedraw) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    
    const selectedColor = isDarkMode 
      ? 'rgba(100, 130, 180, 0.5)'
      : 'rgba(200, 230, 255, 0.6)';
      
    const focusColor = isDarkMode
      ? '#6ab7ff'
      : '#1a73e8';
      
    const headerSelectedColor = isDarkMode
      ? 'rgba(120, 140, 190, 0.7)'
      : 'rgba(180, 210, 250, 0.8)';
    
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    
    // Highlight selected cells
    if (state.selectedCells && state.selectedCells.length > 0) {
      const selectedRows = new Set();
      const selectedCols = new Set();
      
      // Draw selection background for each cell
      ctx.fillStyle = selectedColor;
      
      state.selectedCells.forEach(cellId => {
        const [col, row] = getCellIndices(cellId);
        const { x, y, width, height } = getCellPosition(col, row);
        
        const adjustedX = x - scrollLeft;
        const adjustedY = y - scrollTop;
        
        selectedRows.add(row);
        selectedCols.add(col);
        
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
      
      // Draw selection border
      ctx.strokeStyle = isDarkMode ? '#8ab4f8' : '#4285f4';
      ctx.lineWidth = 1;
      
      if (state.selectedCells.length > 1) {
        // Find selection bounds
        let minCol = Infinity, maxCol = -Infinity;
        let minRow = Infinity, maxRow = -Infinity;
        
        state.selectedCells.forEach(cellId => {
          const [col, row] = getCellIndices(cellId);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
        });
        
        // Draw selection border
        const startPos = getCellPosition(minCol, minRow);
        const endPos = getCellPosition(maxCol, maxRow);
        
        const x = startPos.x - scrollLeft;
        const y = startPos.y - scrollTop;
        const width = (endPos.x + endPos.width) - startPos.x;
        const height = (endPos.y + endPos.height) - startPos.y;
        
        ctx.strokeRect(x, y, width, height);
      }
    }
    
    // Draw focus indicator on active cell
    if (state.activeCell && !isEditing) {
      const [col, row] = getCellIndices(state.activeCell);
      const { x, y, width, height } = getCellPosition(col, row);
      
      const adjustedX = x - scrollLeft;
      const adjustedY = y - scrollTop;
      
      // Draw focus border
      ctx.strokeStyle = focusColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(adjustedX, adjustedY, width, height);
    }
    
    renderInfoRef.current.overlayNeedsRedraw = false;
    
    // Update FPS counter
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFrameTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, [state.selectedCells, state.activeCell, isEditing, getCellPosition]);
  
  // Main render function
  const render = useCallback(() => {
    if (!gridCanvasRef.current || !cellsCanvasRef.current || !overlayCanvasRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
      return;
    }
    
    // Resize canvases if needed
    const container = containerRef.current;
    if (container && (container.clientWidth !== canvasSize.width || 
                       container.clientHeight !== canvasSize.height)) {
      setCanvasSize({ width: container.clientWidth, height: container.clientHeight });
      renderInfoRef.current.gridNeedsRedraw = true;
      renderInfoRef.current.cellsNeedsRedraw = true;
      renderInfoRef.current.overlayNeedsRedraw = true;
    }
    
    // Draw all layers
    drawGrid();
    drawCells();
    drawOverlay();
    
    // Continue animation loop if needed
    if (!renderInfoRef.current.initialized || 
        renderInfoRef.current.gridNeedsRedraw || 
        renderInfoRef.current.cellsNeedsRedraw || 
        renderInfoRef.current.overlayNeedsRedraw) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
    
    renderInfoRef.current.initialized = true;
  }, [drawGrid, drawCells, drawOverlay, canvasSize]);
  
  // Handle scroll with full redraw
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    setScrollPosition({
      x: container.scrollLeft,
      y: container.scrollTop
    });
    
    // Always redraw all layers when scrolling
    renderInfoRef.current.gridNeedsRedraw = true;
    renderInfoRef.current.cellsNeedsRedraw = true;
    renderInfoRef.current.overlayNeedsRedraw = true;
    
    // Request animation frame
    if (!renderRequestRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
  }, [render]);
  
  // Handle mouse down for cell selection
  const handleMouseDown = useCallback((e) => {
    // Ignore if editing or not primary button
    if (isEditing || e.button !== 0) return;
    
    const cellId = getCellIdAtPosition(e.clientX, e.clientY);
    if (!cellId) return;
    
    // Start selection process
    setSelectionStart(cellId);
    setIsSelecting(true);
    
    // Set active cell
    setActiveCell(cellId);
    
    // Select single cell
    selectCells([cellId]);
    
    // Mark overlay for redraw
    renderInfoRef.current.overlayNeedsRedraw = true;
    
    if (!renderRequestRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
  }, [isEditing, getCellIdAtPosition, setActiveCell, selectCells, render]);
  
  // Handle mouse move for selection range
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
    
    if (!renderRequestRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
  }, [isSelecting, selectionStart, getCellIdAtPosition, selectCells, render]);
  
  // Handle mouse up to end selection
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);
  
  // Handle double click to edit cell
  const handleDoubleClick = useCallback((e) => {
    // Prevent event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    const cellId = getCellIdAtPosition(e.clientX, e.clientY);
    if (!cellId) return;
    
    // Get cell data and position
    const cellData = getCellData(cellId);
    const [col, row] = getCellIndices(cellId);
    const cellPosition = getCellPosition(col, row);
    
    const container = containerRef.current;
    if (!container) return;
    
    // Set editing state
    setIsEditing(true);
    setEditCellId(cellId);
    
    // Get formula or value, with formula taking precedence
    setEditValue(cellData.formula || cellData.value || '');
    
    // Calculate editor position
    const rect = container.getBoundingClientRect();
    
    setEditPosition({
      x: cellPosition.x - container.scrollLeft + rect.left,
      y: cellPosition.y - container.scrollTop + rect.top,
      width: cellPosition.width,
      height: cellPosition.height
    });
  }, [getCellIdAtPosition, getCellData, getCellPosition]);
  
  // Handle keyboard navigation and editing
  const handleKeyDown = useCallback((e) => {
    // Skip if already editing
    if (isEditing) return;
    
    // Skip if event isn't from container
    if (e.target !== containerRef.current) return;
    
    // Navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
      
      if (!state.activeCell) return;
      
      // Determine direction
      const direction = e.key === 'Tab' 
        ? (e.shiftKey ? 'left' : 'right') 
        : e.key === 'Enter'
          ? (e.shiftKey ? 'up' : 'down')
          : e.key.replace('Arrow', '').toLowerCase();
      
      // Get next cell
      const nextCellId = navigateWithKeyboard(direction, state.activeCell);
      if (nextCellId) {
        setActiveCell(nextCellId);
        selectCells([nextCellId]);
        
        // Ensure cell is visible (auto-scroll)
        const [col, row] = getCellIndices(nextCellId);
        const { x, y, width, height } = getCellPosition(col, row);
        const container = containerRef.current;
        
        if (x < container.scrollLeft + ROW_HEADER_WIDTH) {
          container.scrollLeft = Math.max(0, x - ROW_HEADER_WIDTH);
        } else if (x + width > container.scrollLeft + container.clientWidth) {
          container.scrollLeft = x + width - container.clientWidth + 5;
        }
        
        if (y < container.scrollTop + COLUMN_HEADER_HEIGHT) {
          container.scrollTop = Math.max(0, y - COLUMN_HEADER_HEIGHT);
        } else if (y + height > container.scrollTop + container.clientHeight) {
          container.scrollTop = y + height - container.clientHeight + 5;
        }
        
        // Mark overlay for redraw
        renderInfoRef.current.overlayNeedsRedraw = true;
        if (!renderRequestRef.current) {
          renderRequestRef.current = requestAnimationFrame(render);
        }
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Clear selected cells
      if (state.selectedCells.length > 0) {
        state.selectedCells.forEach(cellId => {
          updateCellValue(cellId, '');
        });
        
        // Mark for redraw
        renderInfoRef.current.cellsNeedsRedraw = true;
        if (!renderRequestRef.current) {
          renderRequestRef.current = requestAnimationFrame(render);
        }
      }
    } else if (e.key === 'F2') {
      // F2 key starts editing like Excel
      if (state.activeCell) {
        startEditingActiveCell();
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Typing starts editing with the pressed key
      if (!state.activeCell) return;
      
      startEditingActiveCell(e.key);
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
  
  // Helper to start editing the active cell
  const startEditingActiveCell = useCallback((initialValue = null) => {
    if (!state.activeCell || !containerRef.current) return;
    
    const [col, row] = getCellIndices(state.activeCell);
    const cellPosition = getCellPosition(col, row);
    const cellData = getCellData(state.activeCell);
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Set editing state
    setIsEditing(true);
    setEditCellId(state.activeCell);
    
    // If we have an initial value, use it; otherwise use existing value/formula
    const value = initialValue !== null 
      ? initialValue 
      : (cellData.formula || cellData.value || '');
      
    setEditValue(value);
    
    // Position editor
    setEditPosition({
      x: cellPosition.x - container.scrollLeft + rect.left,
      y: cellPosition.y - container.scrollTop + rect.top,
      width: cellPosition.width,
      height: cellPosition.height
    });
  }, [state.activeCell, getCellIndices, getCellPosition, getCellData]);
  
  // Handle edit field change
  const handleEditChange = useCallback((e) => {
    // Use direct value from event to prevent state lag
    setEditValue(e.target.value);
  }, []);
  
  // Handle edit field key presses
  const handleEditKeyDown = useCallback((e) => {
    // Stop propagation to prevent container from processing the same event
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      // Finish editing and move down
      e.preventDefault();
      
      if (editCellId) {
        updateCellValue(editCellId, editValue);
        setIsEditing(false);
        
        // Move to next cell
        const nextCellId = navigateWithKeyboard('down', editCellId);
        if (nextCellId) {
          setActiveCell(nextCellId);
          selectCells([nextCellId]);
        }
        
        // Mark for redraw
        renderInfoRef.current.cellsNeedsRedraw = true;
        renderInfoRef.current.overlayNeedsRedraw = true;
        if (!renderRequestRef.current) {
          renderRequestRef.current = requestAnimationFrame(render);
        }
        
        // Restore focus to container
        setTimeout(() => {
          containerRef.current?.focus();
        }, 0);
      }
    } else if (e.key === 'Escape') {
      // Cancel editing
      e.preventDefault();
      setIsEditing(false);
      
      // Restore focus to container
      setTimeout(() => {
        containerRef.current?.focus();
      }, 0);
    } else if (e.key === 'Tab') {
      // Finish editing and move right or left
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
        
        // Mark for redraw
        renderInfoRef.current.cellsNeedsRedraw = true;
        renderInfoRef.current.overlayNeedsRedraw = true;
        if (!renderRequestRef.current) {
          renderRequestRef.current = requestAnimationFrame(render);
        }
        
        // Restore focus to container
        setTimeout(() => {
          containerRef.current?.focus();
        }, 0);
      }
    }
  }, [
    editCellId, 
    editValue, 
    updateCellValue, 
    navigateWithKeyboard, 
    setActiveCell, 
    selectCells, 
    render
  ]);
  
  // Handle edit field blur
  const handleEditBlur = useCallback(() => {
    if (editCellId) {
      updateCellValue(editCellId, editValue);
      setIsEditing(false);
      
      // Mark for redraw
      renderInfoRef.current.cellsNeedsRedraw = true;
      if (!renderRequestRef.current) {
        renderRequestRef.current = requestAnimationFrame(render);
      }
      
      // Restore focus to container
      setTimeout(() => {
        containerRef.current?.focus();
      }, 0);
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
  
  // Initialize and resize canvases
  useEffect(() => {
    const resizeCanvases = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const { clientWidth, clientHeight } = container;
      
      // Get device pixel ratio for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      
      // Set all canvas dimensions with proper scaling
      [gridCanvasRef, cellsCanvasRef, overlayCanvasRef].forEach(canvasRef => {
        if (!canvasRef.current) return;
        
        // Set physical size
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
        
        // Set display size
        canvasRef.current.style.width = `${clientWidth}px`;
        canvasRef.current.style.height = `${clientHeight}px`;
        
        // Scale for high-DPI
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      });
      
      setCanvasSize({ width: clientWidth, height: clientHeight });
      
      // Mark all layers for redraw
      renderInfoRef.current.gridNeedsRedraw = true;
      renderInfoRef.current.cellsNeedsRedraw = true;
      renderInfoRef.current.overlayNeedsRedraw = true;
      
      // Clear position cache
      renderInfoRef.current.cellPositions.clear();
      
      // Trigger render
      if (!renderRequestRef.current) {
        renderRequestRef.current = requestAnimationFrame(render);
      }
    };
    
    // Initial resize
    resizeCanvases();
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvases);
    
    return () => {
      window.removeEventListener('resize', resizeCanvases);
      
      // Cancel any pending animation frames
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
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
    
    if (!renderRequestRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
  }, [state.selectedCells, state.activeCell, render]);
  
  // Force redraw when cell data changes
  useEffect(() => {
    renderInfoRef.current.cellsNeedsRedraw = true;
    
    if (!renderRequestRef.current) {
      renderRequestRef.current = requestAnimationFrame(render);
    }
  }, [activeSheet.cells, render]);
  
  // Start the render loop and focus container
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.focus();
    }
    
    // Start render loop
    renderRequestRef.current = requestAnimationFrame(render);
    
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [render]);
  
  return (
    <div className="canvas-grid-container" data-mode={isSelecting ? "selecting" : "default"}>
      <div 
        ref={containerRef}
        className="canvas-scroll-container"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
      >
        <div 
          style={{ 
            width: getTotalWidth(), 
            height: getTotalHeight(),
            position: 'relative'
          }}
        >
          {/* Canvas layers - FIXED positioning */}
          <canvas
            ref={gridCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{
              position: 'fixed',
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
              position: 'fixed',
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
              position: 'fixed',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 3
            }}
          />
        </div>
      </div>
      
      {/* Cell editor with improved handling */}
      {isEditing && (
        <div 
          className="cell-editor-container" 
          style={{
            position: 'fixed',
            left: `${editPosition.x}px`,
            top: `${editPosition.y}px`,
            width: `${editPosition.width}px`,
            height: `${editPosition.height}px`,
            zIndex: 20
          }}
        >
          <input
            ref={editorRef}
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            className="cell-editor"
            autoFocus
            onFocus={(e) => {
              const length = e.target.value.length;
              e.target.setSelectionRange(length, length);
            }}
          />
        </div>
      )}
      
      {/* Performance stats */}
      <div className="performance-stats">
        FPS: {fps} | Cells: {state.selectedCells.length}
      </div>
    </div>
  );
}

export default CanvasGrid;