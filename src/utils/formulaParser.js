import * as math from 'mathjs'

// Cache for formula evaluations to prevent redundant calculations
const evaluationCache = new Map()

/**
 * Optimized formula parser with caching for better performance
 */
export class FormulaParser {
  constructor(getCellValueFn) {
    this.getCellValue = getCellValueFn
    this.cellsUsed = new Set()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  /**
   * Evaluates a formula and returns the result with caching
   * @param {string} formula - The formula to evaluate
   * @returns {*} The evaluated result
   */
  evaluate(formula) {
    if (!formula || typeof formula !== 'string') return ''
    if (!formula.startsWith('=')) return formula

    // Check cache first
    const cacheKey = formula
    if (evaluationCache.has(cacheKey)) {
      this.cacheHits++
      const cachedResult = evaluationCache.get(cacheKey)
      // Clone the cellsUsed set from the cache
      this.cellsUsed = new Set(cachedResult.dependencies)
      return cachedResult.value
    }

    this.cacheMisses++
    // Reset cells used for this evaluation
    this.cellsUsed.clear()

    try {
      // Remove the equals sign
      const expression = formula.substring(1)
      
      // Process cell references
      const processedExpression = this.replaceCellReferences(expression)
      
      // Evaluate the expression
      const result = this.evaluateExpression(processedExpression)
      
      // Store in cache with cell dependencies
      evaluationCache.set(cacheKey, {
        value: result,
        dependencies: new Set(this.cellsUsed)
      })
      
      // Limit cache size to prevent memory issues
      if (evaluationCache.size > 1000) {
        const keysIterator = evaluationCache.keys()
        evaluationCache.delete(keysIterator.next().value) // Remove oldest entry
      }
      
      return result
    } catch (error) {
      console.error('Error evaluating formula:', error)
      return '#ERROR!'
    }
  }

  /**
   * Clears the formula evaluation cache
   */
  clearCache() {
    evaluationCache.clear()
  }

  /**
   * Invalidates cache entries that depend on specific cells
   * @param {Array<string>} cellIds - Cell IDs to invalidate
   */
  invalidateCellDependencies(cellIds) {
    // For each cache entry, check if it depends on any of the cells
    for (const [key, entry] of evaluationCache.entries()) {
      for (const cellId of cellIds) {
        if (entry.dependencies.has(cellId)) {
          evaluationCache.delete(key)
          break
        }
      }
    }
  }

  /**
   * Replaces cell references with their values
   * @param {string} expression - The expression to process
   * @returns {string} The processed expression
   */
  replaceCellReferences(expression) {
    // Performance optimization: Faster regex for cell references
    const cellRefRegex = /([A-Z]+[0-9]+)/g
    
    // Use a single pass through the expression
    return expression.replace(cellRefRegex, (match) => {
      // Track that this cell was used in the formula
      this.cellsUsed.add(match)
      
      const value = this.getCellValue(match)
      
      // If value is a number, return it directly
      if (!isNaN(value) && value !== '') {
        return value
      }
      
      // If value is empty, treat as 0
      if (value === '') {
        return '0'
      }
      
      // For text values, wrap in quotes
      return `"${value}"`
    })
  }

  /**
   * Evaluates a mathematical expression using caching where possible
   * @param {string} expression - The expression to evaluate
   * @returns {*} The evaluated result
   */
  evaluateExpression(expression) {
    // First check if it's a special function
    const upperExpression = expression.toUpperCase()
    
    if (upperExpression.startsWith('SUM(')) {
      return this.evaluateSum(expression)
    } else if (upperExpression.startsWith('AVERAGE(')) {
      return this.evaluateAverage(expression)
    } else if (upperExpression.startsWith('MIN(')) {
      return this.evaluateMin(expression)
    } else if (upperExpression.startsWith('MAX(')) {
      return this.evaluateMax(expression)
    } else if (upperExpression.startsWith('COUNT(')) {
      return this.evaluateCount(expression)
    }
    
    // Regular expression evaluation - try to use mathjs safely
    try {
      return math.evaluate(expression)
    } catch (error) {
      console.error('Math evaluation error:', error)
      return '#ERROR!'
    }
  }

  /**
   * Gets the set of cells used in the last formula evaluation
   * @returns {Set<string>} The set of cell IDs
   */
  getCellsUsed() {
    return this.cellsUsed
  }
  
  /**
   * Optimized function to parse a range of cells
   * @param {string} range - The range string (e.g., A1:B3)
   * @returns {Array<string>} Array of cell IDs in the range
   */
  parseCellRange(range) {
    const parts = range.split(':')
    if (parts.length !== 2) return [range]
    
    const startCell = parts[0]
    const endCell = parts[1]
    
    const cellRegex = /([A-Z]+)([0-9]+)/
    const startMatch = startCell.match(cellRegex)
    const endMatch = endCell.match(cellRegex)
    
    if (!startMatch || !endMatch) return [range]
    
    const startCol = this.columnLetterToIndex(startMatch[1])
    const startRow = parseInt(startMatch[2])
    const endCol = this.columnLetterToIndex(endMatch[1])
    const endRow = parseInt(endMatch[2])
    
    // Limit range size for performance
    const maxCells = 1000
    const rangeSize = (Math.abs(endRow - startRow) + 1) * (Math.abs(endCol - startCol) + 1)
    
    if (rangeSize > maxCells) {
      console.warn(`Cell range too large (${rangeSize} cells). Limiting to ${maxCells} cells.`)
      return this.generateLimitedRange(startCol, startRow, endCol, endRow, maxCells)
    }
    
    return this.generateCellRange(startCol, startRow, endCol, endRow)
  }
  
  /**
   * Generate a limited range of cells for performance
   */
  generateLimitedRange(startCol, startRow, endCol, endRow, maxCells) {
    const cells = []
    const minCol = Math.min(startCol, endCol)
    const maxCol = Math.max(startCol, endCol)
    const minRow = Math.min(startRow, endRow)
    const maxRow = Math.max(startRow, endRow)
    
    let count = 0
    
    for (let row = minRow; row <= maxRow && count < maxCells; row++) {
      for (let col = minCol; col <= maxCol && count < maxCells; col++) {
        cells.push(`${this.indexToColumnLetter(col)}${row}`)
        count++
      }
    }
    
    return cells
  }
  
  /**
   * Generate a full range of cells
   */
  generateCellRange(startCol, startRow, endCol, endRow) {
    const cells = []
    const minCol = Math.min(startCol, endCol)
    const maxCol = Math.max(startCol, endCol)
    const minRow = Math.min(startRow, endRow)
    const maxRow = Math.max(startRow, endRow)
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push(`${this.indexToColumnLetter(col)}${row}`)
      }
    }
    
    return cells
  }
  
  /**
   * Convert column letter to index (optimized)
   */
  columnLetterToIndex(letter) {
    let index = 0
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64)
    }
    return index
  }
  
  /**
   * Convert index to column letter (optimized)
   */
  indexToColumnLetter(index) {
    let result = ''
    while (index > 0) {
      const remainder = (index - 1) % 26
      result = String.fromCharCode(65 + remainder) + result
      index = Math.floor((index - 1) / 26)
    }
    return result
  }

  // The remaining function implementations (evaluateSum, evaluateAverage, etc.)
  // would follow similar patterns with performance optimizations
  
  /**
   * Evaluates a SUM function (optimized)
   */
  evaluateSum(expression) {
    // Extract arguments
    const argsMatch = expression.match(/SUM\((.*)\)/i)
    if (!argsMatch) return '#ERROR!'
    
    try {
      const args = argsMatch[1].split(',')
      let sum = 0
      
      for (const arg of args) {
        const trimmedArg = arg.trim()
        
        // Check if it's a range
        if (trimmedArg.includes(':')) {
          const cells = this.parseCellRange(trimmedArg)
          
          for (const cell of cells) {
            this.cellsUsed.add(cell)
            const value = parseFloat(this.getCellValue(cell))
            if (!isNaN(value)) {
              sum += value
            }
          }
        } else {
          // Single cell or value
          if (trimmedArg.match(/^[A-Z]+[0-9]+$/)) {
            // It's a cell reference
            this.cellsUsed.add(trimmedArg)
            const value = parseFloat(this.getCellValue(trimmedArg))
            if (!isNaN(value)) {
              sum += value
            }
          } else {
            // It's a value
            const value = parseFloat(trimmedArg)
            if (!isNaN(value)) {
              sum += value
            }
          }
        }
      }
      
      return sum
    } catch (error) {
      console.error('Error in SUM formula:', error)
      return '#ERROR!'
    }
  }
  
  // Other function implementations would be similar, with added
  // error handling and performance optimizations
}

// Helper functions for working with formulas
export const formulaHelpers = {
  /**
   * Checks if a string starts with an equals sign, indicating it's a formula
   */
  isFormula(value) {
    return typeof value === 'string' && value.startsWith('=')
  },
  
  /**
   * Gets the display value for a cell
   */
  getDisplayValue(cellData) {
    if (!cellData) return ''
    
    // If we have a formula, show the evaluated value
    if (cellData.formula && typeof cellData.value !== 'undefined') {
      return cellData.value
    }
    
    // Otherwise show the raw value
    return cellData.value || ''
  },
  
  /**
   * Clear the formula evaluation cache
   */
  clearCache() {
    evaluationCache.clear()
  }
}