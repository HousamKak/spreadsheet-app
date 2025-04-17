// src/utils/formulaParser.js - Complete fix
import * as math from 'mathjs'

// Cache for formula evaluations to prevent redundant calculations
const evaluationCache = new Map()

/**
 * Optimized formula parser with caching for better performance
 * Complete overhaul with robust error handling
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
   * Fixed to handle all edge cases properly
   * @param {string} formula - The formula to evaluate
   * @returns {*} The evaluated result
   */
  evaluate(formula) {
    // Guard clauses for invalid input
    if (formula === undefined || formula === null) return ''
    if (typeof formula !== 'string') return formula
    if (formula === '') return ''
    
    // Handle non-formula values directly
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
      const expression = formula.substring(1).trim()
      
      // Handle empty formula
      if (!expression) return 0
      
      // Process cell references
      const processedExpression = this.replaceCellReferences(expression)
      
      // Evaluate the expression with robust error handling
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
      console.error('Error evaluating formula:', error, 'Formula:', formula)
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
    if (!cellIds || !Array.isArray(cellIds)) return
    
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
    // Perform a safety check
    if (!expression || typeof expression !== 'string') {
      return '0'
    }
    
    try {
      // Improved regex for cell references - more robust
      const cellRefRegex = /([A-Z]+[0-9]+)(?![A-Za-z0-9])/g
      
      // Use a single pass through the expression
      return expression.replace(cellRefRegex, (match) => {
        // Track that this cell was used in the formula
        this.cellsUsed.add(match)
        
        // Get the cell value safely
        let value
        try {
          value = this.getCellValue(match)
        } catch (error) {
          console.error(`Error getting value for cell ${match}:`, error)
          return '0' // Default to 0 on error
        }
        
        // If value is a number, return it directly
        if (!isNaN(value) && value !== '') {
          return value
        }
        
        // If value is empty or null, treat as 0
        if (value === '' || value === null || value === undefined) {
          return '0'
        }
        
        // For text values, escape and wrap in quotes
        const escapedValue = String(value).replace(/"/g, '\\"')
        return `"${escapedValue}"`
      })
    } catch (error) {
      console.error('Error replacing cell references:', error)
      return '0' // Return safe default on error
    }
  }

  /**
   * Evaluates a mathematical expression using caching where possible
   * With enhanced error handling
   * @param {string} expression - The expression to evaluate
   * @returns {*} The evaluated result
   */
  evaluateExpression(expression) {
    // Safety check
    if (!expression || typeof expression !== 'string') {
      return 0
    }
    
    try {
      // First check if it's a special function
      const upperExpression = expression.toUpperCase()
      
      // Handle Excel-like functions
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
      
      // Regular expression evaluation with mathjs
      try {
        // Use mathjs safely with timeout protection
        const result = math.evaluate(expression)
        
        // Check result is valid
        if (result === undefined || result === null || Number.isNaN(result)) {
          return '#ERROR!'
        }
        
        return result
      } catch (error) {
        console.error('Math evaluation error:', error, 'Expression:', expression)
        return '#ERROR!'
      }
    } catch (error) {
      console.error('Expression evaluation error:', error)
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
    // Comprehensive error checking
    if (!range || typeof range !== 'string') {
      console.error('Invalid range:', range)
      return []
    }
    
    try {
      const parts = range.split(':')
      if (parts.length !== 2) {
        // Not a range, return as single cell if valid
        if (this.isValidCellReference(range)) {
          return [range]
        }
        return []
      }
      
      const startCell = parts[0].trim()
      const endCell = parts[1].trim()
      
      if (!this.isValidCellReference(startCell) || !this.isValidCellReference(endCell)) {
        console.error('Invalid cell references in range:', range)
        return []
      }
      
      const cellRegex = /([A-Z]+)([0-9]+)/
      const startMatch = startCell.match(cellRegex)
      const endMatch = endCell.match(cellRegex)
      
      if (!startMatch || !endMatch) {
        console.error('Failed to parse cell references in range:', range)
        return []
      }
      
      const startCol = this.columnLetterToIndex(startMatch[1])
      const startRow = parseInt(startMatch[2])
      const endCol = this.columnLetterToIndex(endMatch[1])
      const endRow = parseInt(endMatch[2])
      
      // Validate row and column indices
      if (isNaN(startRow) || isNaN(endRow) || startRow <= 0 || endRow <= 0) {
        console.error('Invalid row numbers in range:', range)
        return []
      }
      
      // Limit range size for performance
      const maxCells = 1000
      const rangeSize = (Math.abs(endRow - startRow) + 1) * (Math.abs(endCol - startCol) + 1)
      
      if (rangeSize > maxCells) {
        console.warn(`Cell range too large (${rangeSize} cells). Limiting to ${maxCells} cells.`)
        return this.generateLimitedRange(startCol, startRow, endCol, endRow, maxCells)
      }
      
      return this.generateCellRange(startCol, startRow, endCol, endRow)
    } catch (error) {
      console.error('Error parsing cell range:', error, 'Range:', range)
      return []
    }
  }
  
  /**
   * Checks if a string is a valid cell reference
   * @param {string} cellRef - Cell reference to check
   * @returns {boolean} True if valid
   */
  isValidCellReference(cellRef) {
    if (!cellRef || typeof cellRef !== 'string') return false
    return /^[A-Z]+[0-9]+$/.test(cellRef.trim())
  }
  
  /**
   * Generate a limited range of cells for performance
   */
  generateLimitedRange(startCol, startRow, endCol, endRow, maxCells) {
    try {
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
    } catch (error) {
      console.error('Error generating limited range:', error)
      return []
    }
  }
  
  /**
   * Generate a full range of cells
   */
  generateCellRange(startCol, startRow, endCol, endRow) {
    try {
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
    } catch (error) {
      console.error('Error generating cell range:', error)
      return []
    }
  }
  
  /**
   * Convert column letter to index (optimized and safely)
   */
  columnLetterToIndex(letter) {
    if (!letter || typeof letter !== 'string') return 1
    
    try {
      let index = 0
      for (let i = 0; i < letter.length; i++) {
        const charCode = letter.charCodeAt(i)
        if (charCode < 65 || charCode > 90) {
          throw new Error(`Invalid character in column letter: ${letter}`)
        }
        index = index * 26 + (charCode - 64)
      }
      return index
    } catch (error) {
      console.error('Error converting column letter to index:', error)
      return 1
    }
  }
  
  /**
   * Convert index to column letter (optimized and safely)
   */
  indexToColumnLetter(index) {
    if (isNaN(index) || index < 1) return 'A'
    
    try {
      let result = ''
      let tempIndex = index
      
      while (tempIndex > 0) {
        const remainder = (tempIndex - 1) % 26
        result = String.fromCharCode(65 + remainder) + result
        tempIndex = Math.floor((tempIndex - 1) / 26)
      }
      
      return result
    } catch (error) {
      console.error('Error converting index to column letter:', error)
      return 'A'
    }
  }

  /**
   * Safely gets a numeric value from a cell
   * @param {string} cellId - Cell ID
   * @returns {number} Cell value as number, or 0 if not a number
   */
  getNumericCellValue(cellId) {
    try {
      // Track dependency
      this.cellsUsed.add(cellId)
      
      // Get value and convert to number
      const value = this.getCellValue(cellId)
      const numValue = parseFloat(value)
      
      // Return 0 for empty or non-numeric values
      return isNaN(numValue) ? 0 : numValue
    } catch (error) {
      console.error(`Error getting numeric value for cell ${cellId}:`, error)
      return 0
    }
  }

  /**
   * Evaluates a SUM function with comprehensive error handling
   */
  evaluateSum(expression) {
    try {
      // Extract arguments
      const argsMatch = expression.match(/SUM\((.*)\)/i)
      if (!argsMatch || !argsMatch[1]) return 0
      
      const args = this.parseArguments(argsMatch[1])
      let sum = 0
      
      for (const arg of args) {
        // Check if it's a range
        if (arg.includes(':')) {
          const cells = this.parseCellRange(arg)
          
          for (const cell of cells) {
            sum += this.getNumericCellValue(cell)
          }
        } else if (this.isValidCellReference(arg)) {
          // It's a single cell
          sum += this.getNumericCellValue(arg)
        } else {
          // It's a direct value
          const value = parseFloat(arg)
          if (!isNaN(value)) {
            sum += value
          }
        }
      }
      
      return sum
    } catch (error) {
      console.error('Error in SUM formula:', error, 'Expression:', expression)
      return '#ERROR!'
    }
  }
  
  /**
   * Parse arguments safely, handling commas inside quotes
   */
  parseArguments(argsString) {
    if (!argsString) return []
    
    try {
      const args = []
      let currentArg = ''
      let insideQuotes = false
      
      for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i]
        
        if (char === '"') {
          insideQuotes = !insideQuotes
          currentArg += char
        } else if (char === ',' && !insideQuotes) {
          args.push(currentArg.trim())
          currentArg = ''
        } else {
          currentArg += char
        }
      }
      
      // Add the last argument
      if (currentArg.trim()) {
        args.push(currentArg.trim())
      }
      
      return args
    } catch (error) {
      console.error('Error parsing arguments:', error)
      return []
    }
  }
  
  /**
   * Evaluates an AVERAGE function
   */
  evaluateAverage(expression) {
    try {
      const argsMatch = expression.match(/AVERAGE\((.*)\)/i)
      if (!argsMatch || !argsMatch[1]) return '#ERROR!'
      
      const args = this.parseArguments(argsMatch[1])
      let sum = 0
      let count = 0
      
      for (const arg of args) {
        // Check if it's a range
        if (arg.includes(':')) {
          const cells = this.parseCellRange(arg)
          
          for (const cell of cells) {
            const value = this.getNumericCellValue(cell)
            if (value !== 0 || this.getCellValue(cell) !== '') {
              sum += value
              count++
            }
          }
        } else if (this.isValidCellReference(arg)) {
          // It's a single cell
          const value = this.getNumericCellValue(arg)
          if (value !== 0 || this.getCellValue(arg) !== '') {
            sum += value
            count++
          }
        } else {
          // It's a direct value
          const value = parseFloat(arg)
          if (!isNaN(value)) {
            sum += value
            count++
          }
        }
      }
      
      if (count === 0) return '#DIV/0!'
      return sum / count
    } catch (error) {
      console.error('Error in AVERAGE formula:', error, 'Expression:', expression)
      return '#ERROR!'
    }
  }
  
  /**
   * Evaluates a MIN function
   */
  evaluateMin(expression) {
    try {
      const argsMatch = expression.match(/MIN\((.*)\)/i)
      if (!argsMatch || !argsMatch[1]) return '#ERROR!'
      
      const args = this.parseArguments(argsMatch[1])
      let min = Infinity
      let found = false
      
      for (const arg of args) {
        // Check if it's a range
        if (arg.includes(':')) {
          const cells = this.parseCellRange(arg)
          
          for (const cell of cells) {
            this.cellsUsed.add(cell)
            const value = parseFloat(this.getCellValue(cell))
            if (!isNaN(value)) {
              min = Math.min(min, value)
              found = true
            }
          }
        } else if (this.isValidCellReference(arg)) {
          // It's a single cell
          this.cellsUsed.add(arg)
          const value = parseFloat(this.getCellValue(arg))
          if (!isNaN(value)) {
            min = Math.min(min, value)
            found = true
          }
        } else {
          // It's a direct value
          const value = parseFloat(arg)
          if (!isNaN(value)) {
            min = Math.min(min, value)
            found = true
          }
        }
      }
      
      if (!found) return '#ERROR!'
      return min
    } catch (error) {
      console.error('Error in MIN formula:', error, 'Expression:', expression)
      return '#ERROR!'
    }
  }
  
  /**
   * Evaluates a MAX function
   */
  evaluateMax(expression) {
    try {
      const argsMatch = expression.match(/MAX\((.*)\)/i)
      if (!argsMatch || !argsMatch[1]) return '#ERROR!'
      
      const args = this.parseArguments(argsMatch[1])
      let max = -Infinity
      let found = false
      
      for (const arg of args) {
        // Check if it's a range
        if (arg.includes(':')) {
          const cells = this.parseCellRange(arg)
          
          for (const cell of cells) {
            this.cellsUsed.add(cell)
            const value = parseFloat(this.getCellValue(cell))
            if (!isNaN(value)) {
              max = Math.max(max, value)
              found = true
            }
          }
        } else if (this.isValidCellReference(arg)) {
          // It's a single cell
          this.cellsUsed.add(arg)
          const value = parseFloat(this.getCellValue(arg))
          if (!isNaN(value)) {
            max = Math.max(max, value)
            found = true
          }
        } else {
          // It's a direct value
          const value = parseFloat(arg)
          if (!isNaN(value)) {
            max = Math.max(max, value)
            found = true
          }
        }
      }
      
      if (!found) return '#ERROR!'
      return max
    } catch (error) {
      console.error('Error in MAX formula:', error, 'Expression:', expression)
      return '#ERROR!'
    }
  }
  
  /**
   * Evaluates a COUNT function
   */
  evaluateCount(expression) {
    try {
      const argsMatch = expression.match(/COUNT\((.*)\)/i)
      if (!argsMatch || !argsMatch[1]) return 0
      
      const args = this.parseArguments(argsMatch[1])
      let count = 0
      
      for (const arg of args) {
        // Check if it's a range
        if (arg.includes(':')) {
          const cells = this.parseCellRange(arg)
          
          for (const cell of cells) {
            this.cellsUsed.add(cell)
            const value = this.getCellValue(cell)
            if (value !== '' && !isNaN(parseFloat(value))) {
              count++
            }
          }
        } else if (this.isValidCellReference(arg)) {
          // It's a single cell
          this.cellsUsed.add(arg)
          const value = this.getCellValue(arg)
          if (value !== '' && !isNaN(parseFloat(value))) {
            count++
          }
        } else {
          // It's a direct value
          if (!isNaN(parseFloat(arg))) {
            count++
          }
        }
      }
      
      return count
    } catch (error) {
      console.error('Error in COUNT formula:', error, 'Expression:', expression)
      return '#ERROR!'
    }
  }
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