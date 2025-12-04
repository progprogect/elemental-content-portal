// File manipulation utilities

/**
 * Fetch a file from URL and return as Blob
 * Uses extension's fetch to bypass CORS
 */
export async function fetchAsBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }
    return await response.blob()
  } catch (error) {
    throw new Error(`Error fetching file from ${url}: ${error}`)
  }
}

/**
 * Create a File object from Blob
 */
export function createFileFromBlob(
  blob: Blob,
  filename: string,
  mimeType?: string
): File {
  return new File([blob], filename, {
    type: mimeType || blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  })
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Guess MIME type from file extension
 */
export function guessMimeType(filename: string): string {
  const extension = getFileExtension(filename)
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate file type
 */
export function isValidFileType(
  filename: string,
  allowedTypes: string[]
): boolean {
  const extension = getFileExtension(filename)
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return type.slice(1).toLowerCase() === extension
    }
    if (type.includes('/')) {
      // MIME type
      const mimeType = guessMimeType(filename)
      return mimeType.includes(type.split('/')[0])
    }
    return false
  })
}

