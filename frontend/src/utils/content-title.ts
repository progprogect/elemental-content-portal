/**
 * Extracts content title from publication data with priority:
 * 1. Markdown header from content (# Title)
 * 2. First non-empty line from content
 * 3. Note field
 * 4. Task title (fallback)
 * 5. "—" if nothing available
 */
export function extractContentTitle(
  content: string | null | undefined,
  note: string | null | undefined,
  taskTitle?: string
): string {
  // Priority 1: Markdown header from content
  if (content) {
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Check for markdown headers (# Title or ## Title)
      if (trimmed.startsWith('# ')) {
        const title = trimmed.substring(2).trim()
        if (title.length > 0) {
          return title.substring(0, 50)
        }
        // Continue to next line if header is empty
        continue
      }
      if (trimmed.startsWith('## ')) {
        const title = trimmed.substring(3).trim()
        if (title.length > 0) {
          return title.substring(0, 50)
        }
        // Continue to next line if header is empty
        continue
      }
      // If no header found, use first non-empty line
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        // Remove markdown formatting
        const cleaned = trimmed.replace(/[#*`_]/g, '').trim()
        if (cleaned.length > 0) {
          return cleaned.substring(0, 50)
        }
      }
    }
  }

  // Priority 2: Note field
  if (note && note.trim().length > 0) {
    return note.trim().substring(0, 50)
  }

  // Priority 3: Task title
  if (taskTitle && taskTitle.trim().length > 0) {
    return taskTitle.trim().substring(0, 50)
  }

  // Fallback
  return '—'
}

