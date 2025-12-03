import { useState, useEffect, useRef } from 'react'
import { TaskField } from '../services/api/tasks'

interface TableCellEditorProps {
  field: TaskField
  onSave: (fieldId: string, value: any) => Promise<void>
  onCancel?: () => void
}

export default function TableCellEditor({ field, onSave, onCancel }: TableCellEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<any>(field.fieldValue)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Sync value with field.fieldValue when it changes externally (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setValue(field.fieldValue)
    }
  }, [field.fieldValue, isEditing])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement && field.fieldType !== 'checkbox') {
        inputRef.current.select()
      }
    }
  }, [isEditing, field.fieldType])

  const handleClick = () => {
    if (field.fieldType !== 'file' && !isEditing) {
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    try {
      await onSave(field.id, value)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save field:', error)
      // Keep editing mode on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(field.fieldValue)
    setIsEditing(false)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && field.fieldType !== 'checkbox') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleBlur = () => {
    // Small delay to allow click events on buttons to fire
    setTimeout(() => {
      if (isEditing && !isSaving) {
        handleSave()
      }
    }, 200)
  }

  // Render based on field type
  if (field.fieldType === 'checkbox') {
    return (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          checked={value?.checked || false}
          onChange={async (e) => {
            const newValue = { checked: e.target.checked }
            const oldValue = value
            setValue(newValue)
            setIsSaving(true)
            try {
              await onSave(field.id, newValue)
            } catch (error) {
              console.error('Failed to save checkbox:', error)
              setValue(oldValue) // Revert on error
            } finally {
              setIsSaving(false)
            }
          }}
          disabled={isSaving}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
        />
      </div>
    )
  }

  if (field.fieldType === 'file') {
    const fileUrl = value?.url || value?.path || ''
    return (
      <div className="px-2 py-1 text-sm">
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate block max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {value?.filename || 'File'}
          </a>
        ) : (
          <span className="text-gray-400">No file</span>
        )}
      </div>
    )
  }

  if (field.fieldType === 'url') {
    if (isEditing) {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="url"
          value={value?.value || ''}
          onChange={(e) => setValue({ value: e.target.value })}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className="w-full px-2 py-1 text-sm border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
      )
    }

    return (
      <div
        onClick={handleClick}
        className="px-2 py-1 text-sm cursor-text hover:bg-gray-50 rounded min-h-[32px] flex items-center"
      >
        {value?.value ? (
          <a
            href={value.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {value.value}
          </a>
        ) : (
          <span className="text-gray-400">Click to edit</span>
        )}
      </div>
    )
  }

  // Text field
  if (isEditing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value?.value || ''}
        onChange={(e) => setValue({ value: e.target.value })}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className="w-full px-2 py-1 text-sm border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      className="px-2 py-1 text-sm cursor-text hover:bg-gray-50 rounded min-h-[32px] flex items-center"
    >
      {value?.value ? (
        <span className="truncate">{value.value}</span>
      ) : (
        <span className="text-gray-400">Click to edit</span>
      )}
    </div>
  )
}

