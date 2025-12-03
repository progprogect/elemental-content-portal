import { useState, useCallback } from 'react'
import { getErrorMessage, getErrorDetails, isNetworkError, isValidationError } from '../utils/error-handler'

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)

  const handleError = useCallback((err: unknown, customMessage?: string) => {
    const message = customMessage || getErrorMessage(err)
    const details = getErrorDetails(err)
    
    setError(message)
    setErrorDetails(details)
    
    // Log error for debugging
    console.error('Error:', err)
    
    return {
      message,
      details,
      isNetwork: isNetworkError(err),
      isValidation: isValidationError(err),
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setErrorDetails(null)
  }, [])

  return {
    error,
    errorDetails,
    handleError,
    clearError,
  }
}

