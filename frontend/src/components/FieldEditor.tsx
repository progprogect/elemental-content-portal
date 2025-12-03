import { useState } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Select from './ui/Select'
import Button from './ui/Button'
import { TaskField } from '../services/api/tasks'

interface FieldEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (field: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
  }) => void | Promise<void>
  field?: TaskField
}

export default function FieldEditor({ isOpen, onClose, onSave, field }: FieldEditorProps) {
  const [fieldName, setFieldName] = useState(field?.fieldName || '')
  const [fieldType, setFieldType] = useState<'text' | 'file' | 'url' | 'checkbox'>(
    field?.fieldType || 'text'
  )
  const [fieldValue, setFieldValue] = useState<any>(
    field?.fieldValue || (field?.fieldType === 'checkbox' ? { checked: false } : { value: '' })
  )

  const handleSave = async () => {
    if (!fieldName.trim()) {
      return
    }

    let value: any
    if (fieldType === 'checkbox') {
      value = { checked: fieldValue.checked || false }
    } else {
      value = { value: fieldValue.value || '' }
    }

    try {
      await onSave({
        fieldName: fieldName.trim(),
        fieldType,
        fieldValue: value,
      })
      handleClose()
    } catch (error) {
      // Error is handled by parent component, don't close modal
      console.error('Error saving field:', error)
    }
  }

  const handleClose = () => {
    setFieldName('')
    setFieldType('text')
    setFieldValue({ value: '' })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={field ? 'Edit Field' : 'Add Field'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="ml-3">
            {field ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Field Name"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          placeholder="e.g., Description, Style, Duration"
        />
        <Select
          label="Field Type"
          value={fieldType}
          onChange={(e) => {
            const newType = e.target.value as 'text' | 'file' | 'url' | 'checkbox'
            setFieldType(newType)
            if (newType === 'checkbox') {
              setFieldValue({ checked: false })
            } else {
              setFieldValue({ value: '' })
            }
          }}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'file', label: 'File' },
            { value: 'url', label: 'URL' },
            { value: 'checkbox', label: 'Checkbox' },
          ]}
        />
        {fieldType === 'text' && (
          <Input
            label="Value"
            value={fieldValue.value || ''}
            onChange={(e) => setFieldValue({ value: e.target.value })}
            placeholder="Enter text value"
          />
        )}
        {fieldType === 'url' && (
          <Input
            label="URL"
            type="url"
            value={fieldValue.value || ''}
            onChange={(e) => setFieldValue({ value: e.target.value })}
            placeholder="https://example.com"
          />
        )}
        {fieldType === 'checkbox' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={fieldValue.checked || false}
              onChange={(e) => setFieldValue({ checked: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Checked</label>
          </div>
        )}
        {fieldType === 'file' && (
          <div className="text-sm text-gray-600">
            File upload will be available when editing the task
          </div>
        )}
      </div>
    </Modal>
  )
}

