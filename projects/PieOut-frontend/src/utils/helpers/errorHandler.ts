import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

export class ErrorHandler {
  private currentCallErrors = new Map<string, string>()
  private callTimeoutId: number | null = null
  private readonly CALL_RESET_DELAY = 1000 // 1 second after last error to reset
  private originalConsoleError: typeof console.error
  private originalConsoleWarn: typeof console.warn
  private isSetup = false

  constructor() {
    this.originalConsoleError = consoleLogger.error.bind(console)
    this.originalConsoleWarn = console.warn.bind(console)
    this.setupGlobalErrorSuppression()
  }

  private setupGlobalErrorSuppression() {
    if (this.isSetup) return
    this.isSetup = true

    consoleLogger.error = (...args: unknown[]) => {
      const errorMessage = this.extractErrorMessage(args)

      // Reset timer - this extends the current "call" window
      this.resetCallTimer()

      if (this.isAssertError(errorMessage)) {
        const baseHash = this.createBaseErrorHash(errorMessage)
        const cleanMessage = this.cleanAssertError(errorMessage)
        const currentStored = this.currentCallErrors.get(baseHash)

        if (currentStored) {
          // Check if this new message is more detailed than what we have
          if (this.isMoreDetailed(cleanMessage, currentStored)) {
            // Update with more detailed version
            this.currentCallErrors.set(baseHash, cleanMessage)
            // Log the updated, more detailed version
            this.originalConsoleError(`[Smart Contract Error] ${cleanMessage}`)
          }
          // Otherwise suppress (we already have this error or a more detailed version)
          return
        }

        // First occurrence of this error type
        this.currentCallErrors.set(baseHash, cleanMessage)
        this.originalConsoleError(`[Smart Contract Error] ${cleanMessage}`)
      } else {
        // Non-assert errors - use original logic
        const errorHash = this.createErrorHash(errorMessage)
        if (this.currentCallErrors.has(errorHash)) {
          return
        }
        this.currentCallErrors.set(errorHash, errorMessage)
        this.originalConsoleError(...args)
      }
    }

    // Override console.warn too in case some errors come through as warnings
    console.warn = (...args: unknown[]) => {
      const errorMessage = this.extractErrorMessage(args)
      const errorHash = this.createErrorHash(errorMessage)

      this.resetCallTimer()

      if (this.currentCallErrors.has(errorHash)) {
        return // Suppress duplicate warnings within this call
      }

      this.currentCallErrors.set(errorHash, errorMessage)
      this.originalConsoleWarn(...args)
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = event.reason instanceof Error ? event.reason.message : String(event.reason)

      const errorHash = this.createErrorHash(errorMessage)

      this.resetCallTimer()

      if (this.currentCallErrors.has(errorHash)) {
        event.preventDefault() // Suppress duplicate promise rejections within this call
        return
      }

      this.currentCallErrors.set(errorHash, errorMessage)

      // If it's an assert error, clean it and log once
      if (this.isAssertError(errorMessage)) {
        event.preventDefault() // Prevent default browser logging
        const cleanMessage = this.cleanAssertError(errorMessage)
        this.originalConsoleError(`[Unhandled Promise] ${cleanMessage}`)
      }
      // For other errors, let them through normally (will be logged once)
    })

    // Handle regular error events
    window.addEventListener('error', (event) => {
      if (!event.message) return

      const errorHash = this.createErrorHash(event.message)

      this.resetCallTimer()

      if (this.currentCallErrors.has(errorHash)) {
        event.preventDefault() // Suppress duplicate error events within this call
        return
      }

      this.currentCallErrors.set(errorHash, event.message)

      if (this.isAssertError(event.message)) {
        event.preventDefault()
        const cleanMessage = this.cleanAssertError(event.message)
        this.originalConsoleError(`[Error Event] ${cleanMessage}`)
      }
    })
  }

  private createBaseErrorHash(message: string): string {
    // For assert errors, create hash based on pc and app only (ignore at, line, error text)
    // This groups related errors together
    if (this.isAssertError(message)) {
      const pcMatch = message.match(/pc=(\d+)/)
      const appMatch = message.match(/app=(\d+)/)

      return `assert_base_${pcMatch?.[1] || 'unknown'}_${appMatch?.[1] || 'unknown'}`
    }

    return this.createErrorHash(message)
  }

  private isMoreDetailed(newMessage: string, existingMessage: string): boolean {
    // A message is more detailed if it has more information
    const newScore = this.getDetailScore(newMessage)
    const existingScore = this.getDetailScore(existingMessage)

    return newScore > existingScore
  }

  private getDetailScore(message: string): number {
    let score = 0

    // Base points for having pc
    if (message.includes('pc=')) score += 1

    // Extra points for additional details
    if (message.includes('at=')) score += 1
    if (message.includes('app=')) score += 1
    if (message.includes('line ')) score += 1
    if (message.includes(': "')) score += 2 // Error message text

    return score
  }

  private extractErrorMessage(args: unknown[]): string {
    return args
      .map((arg) =>
        typeof arg === 'string'
          ? arg
          : typeof arg === 'object' && arg !== null && 'message' in arg
            ? String((arg as { message: unknown }).message)
            : String(arg),
      )
      .join(' ')
  }

  private isAssertError(message: string): boolean {
    return message.includes('assert failed pc=') || message.includes('assert //')
  }

  private cleanAssertError(message: string): string {
    // Always try to extract all possible information
    const appMatch = message.match(/app=(\d+)/)
    const pcMatch = message.match(/pc=(\d+)/)
    const atMatch = message.match(/at:(\d+)/)
    const errorMatch = message.match(/assert \/\/ (.+?) <--- Error/)
    const lineMatch = message.match(/smart_contracts\/pieout\/contract\.py:(\d+)/)

    // Build the most complete version possible with available data
    if (pcMatch) {
      const pc = pcMatch[1]
      const at = atMatch ? `, at=${atMatch[1]}` : ''
      const app = appMatch ? ` app=${appMatch[1]}` : ''
      const line = lineMatch ? ` (line ${lineMatch[1]})` : ''
      const error = errorMatch ? `: "${errorMatch[1]}"` : ''

      return `Smart contract assertion failed${error} (pc=${pc}${at}${app}${line})`
    }

    // Fallback if no pc found
    return 'Smart contract assertion failed'
  }

  private createErrorHash(message: string): string {
    // For assert errors, create hash based on pc and at values to group identical assertions
    if (this.isAssertError(message)) {
      const pcMatch = message.match(/pc=(\d+)/)
      const atMatch = message.match(/at:(\d+)/)
      const appMatch = message.match(/app=(\d+)/)
      const errorMatch = message.match(/assert \/\/ (.+?) <--- Error/)

      return `assert_${pcMatch?.[1] || 'unknown'}_${atMatch?.[1] || 'unknown'}_${appMatch?.[1] || 'unknown'}_${errorMatch?.[1]?.slice(0, 30) || 'generic'}`
    }

    // For other errors, create hash from first 200 characters
    return btoa(message.slice(0, 200)).slice(0, 30)
  }

  // Reset the call timer - extends the current operation window
  private resetCallTimer() {
    if (this.callTimeoutId !== null) {
      clearTimeout(this.callTimeoutId)
    }

    this.callTimeoutId = window.setTimeout(() => {
      this.currentCallErrors.clear()
      this.callTimeoutId = null
    }, this.CALL_RESET_DELAY)
  }

  // Public method to check if we should log (for backwards compatibility)
  shouldLog(errorMessage: string): boolean {
    const errorHash = this.createErrorHash(errorMessage)
    this.resetCallTimer()

    if (this.currentCallErrors.has(errorHash)) {
      return false
    }
    this.currentCallErrors.set(errorHash, errorMessage)
    return true
  }

  // Method to manually clear current call errors (for immediate reset)
  clearCurrentCallErrors(): void {
    this.currentCallErrors.clear()
    if (this.callTimeoutId !== null) {
      clearTimeout(this.callTimeoutId)
      this.callTimeoutId = null
    }
  }

  // Method to manually start a new call context
  startNewCall(): void {
    this.clearCurrentCallErrors()
  }
}

// Create global instance
export const errorHandler = new ErrorHandler()

// Legacy function for backwards compatibility
export function shouldLogError(errorMessage: string): boolean {
  return errorHandler.shouldLog(errorMessage)
}
