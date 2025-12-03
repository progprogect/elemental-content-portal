import { AxiosError } from 'axios'

export interface ApiError {
  error: string
  details?: any
  message?: string
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined
    
    if (apiError?.error) {
      return apiError.message || apiError.error
    }
    
    if (error.response?.status === 404) {
      return 'Resource not found'
    }
    
    if (error.response?.status === 400) {
      return 'Invalid request. Please check your input.'
    }
    
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.'
    }
    
    return error.message || 'An error occurred'
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

export function getErrorDetails(error: unknown): any {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined
    return apiError?.details || null
  }
  
  return null
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response
  }
  return false
}

export function isValidationError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 400
  }
  return false
}

