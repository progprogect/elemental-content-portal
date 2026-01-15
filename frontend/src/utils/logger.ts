// Simple logger utility for frontend
export const logger = {
  info: (message: string, meta?: any) => {
    if (meta) {
      console.log(`[INFO] ${message}`, meta)
    } else {
      console.log(`[INFO] ${message}`)
    }
  },
  error: (meta: any, message?: string) => {
    if (message) {
      console.error(`[ERROR] ${message}`, meta)
    } else {
      console.error(`[ERROR]`, meta)
    }
  },
  warn: (message: string, meta?: any) => {
    if (meta) {
      console.warn(`[WARN] ${message}`, meta)
    } else {
      console.warn(`[WARN] ${message}`)
    }
  },
  debug: (message: string, meta?: any) => {
    if (import.meta.env.DEV) {
      if (meta) {
        console.debug(`[DEBUG] ${message}`, meta)
      } else {
        console.debug(`[DEBUG] ${message}`)
      }
    }
  },
}

