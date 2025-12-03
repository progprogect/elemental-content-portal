import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, fieldsApi, taskListsApi, fieldTemplatesApi, TaskField } from '../services/api/tasks'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { getErrorMessage } from '../utils/error-handler'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import FieldEditor from '../components/FieldEditor'
import FileUpload from '../components/FileUpload'
import FieldTemplatesManager from '../components/FieldTemplatesManager'
import MediaPreview from '../components/MediaPreview'

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'text', label: 'Text' },
  { value: 'presentation', label: 'Presentation' },
]

export default function TaskForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const isEdit = id && id !== 'new'

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('video')
  const [listId, setListId] = useState<string | null>(null)
  const [fields, setFields] = useState<TaskField[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState<TaskField | undefined>()
  const { error, errorDetails, handleError, clearError } = useErrorHandler()

  // Get listId from URL if coming from a list page
  useEffect(() => {
    const listIdFromState = location.state?.listId
    if (listIdFromState && !isEdit) {
      setListId(listIdFromState)
    }
  }, [location.state, isEdit])

  // Get task lists and field templates
  const { data: taskLists } = useQuery({
    queryKey: ['task-lists'],
    queryFn: taskListsApi.getLists,
  })

  const { data: fieldTemplates } = useQuery({
    queryKey: ['field-templates'],
    queryFn: fieldTemplatesApi.getTemplates,
  })

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!),
    enabled: !!isEdit,
  })

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setContentType(task.contentType)
      setListId(task.listId || null)
      setFields(task.fields || [])
    }
  }, [task])

  const createMutation = useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to create task')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to update task')
    },
  })

  const addFieldMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => fieldsApi.addField(taskId, data),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to add field')
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ taskId, fieldId, data }: { taskId: string; fieldId: string; data: any }) =>
      fieldsApi.updateField(taskId, fieldId, data),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to update field')
    },
  })

  const deleteFieldMutation = useMutation({
    mutationFn: ({ taskId, fieldId }: { taskId: string; fieldId: string }) =>
      fieldsApi.deleteField(taskId, fieldId),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to delete field')
    },
  })

  const handleSave = async () => {
    if (!title.trim()) {
      handleError(new Error('Title is required'), 'Please enter a task title')
      return
    }

    clearError()

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: { title, contentType, listId },
        })
      } else {
        const newTask = await createMutation.mutateAsync({
          title,
          contentType,
          listId: listId || null,
        })
        
        // Add fields from templates first
        if (newTask.id && selectedTemplates.length > 0) {
          for (const templateId of selectedTemplates) {
            try {
              await fieldTemplatesApi.addFieldFromTemplate(newTask.id, templateId)
            } catch (error) {
              console.error(`Failed to add field from template:`, error)
            }
          }
          // Refresh task to get new fields
          queryClient.invalidateQueries({ queryKey: ['task', newTask.id] })
        }
        
        if (newTask.id && fields.length > 0) {
          // Add fields to new task with error handling
          const failedFields: Array<{ field: TaskField; error: string }> = []
          
          for (const field of fields) {
            try {
              await addFieldMutation.mutateAsync({
                taskId: newTask.id,
                data: {
                  fieldName: field.fieldName,
                  fieldType: field.fieldType,
                  fieldValue: field.fieldValue,
                  orderIndex: field.orderIndex,
                },
              })
            } catch (fieldError) {
              const errorMessage = getErrorMessage(fieldError)
              failedFields.push({ field, error: errorMessage })
              console.error(`Failed to add field "${field.fieldName}":`, fieldError)
            }
          }
          
          if (failedFields.length > 0) {
            const failedNames = failedFields.map(f => f.field.fieldName).join(', ')
            handleError(
              new Error(`Failed to add some fields: ${failedNames}`),
              `Task created successfully, but ${failedFields.length} field(s) could not be added: ${failedNames}. You can add them manually.`
            )
            // Still navigate to task page so user can add fields manually
            navigate(`/tasks/${newTask.id}`)
            return
          }
        }
        
        navigate(`/tasks/${newTask.id}`)
      }
    } catch (error) {
      handleError(error)
    }
  }

  const handleFieldSave = async (fieldData: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
  }) => {
    clearError()

    if (!id || id === 'new') {
      // Add to local state for new task
      setFields([...fields, {
        id: `temp-${Date.now()}`,
        ...fieldData,
        orderIndex: fields.length,
        taskId: '',
        createdAt: new Date().toISOString(),
      } as TaskField])
      return
    }

    if (editingField && editingField.id.startsWith('temp-')) {
      // Update local field
      setFields(fields.map(f => f.id === editingField.id ? { ...f, ...fieldData } : f))
      setEditingField(undefined)
      return
    }

    try {
      if (editingField) {
        await updateFieldMutation.mutateAsync({
          taskId: id,
          fieldId: editingField.id,
          data: fieldData,
        })
      } else {
        await addFieldMutation.mutateAsync({
          taskId: id,
          data: {
            ...fieldData,
            orderIndex: fields.length,
          },
        })
      }
    } catch (error) {
      handleError(error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  const handleFieldDelete = async (fieldId: string) => {
    if (!id || id === 'new') {
      setFields(fields.filter(f => f.id !== fieldId))
      return
    }

    try {
      await deleteFieldMutation.mutateAsync({ taskId: id, fieldId })
    } catch (error) {
      handleError(error, 'Failed to delete field')
    }
  }

  const handleFileUpload = async (file: { filename: string; path: string; url: string }) => {
    clearError()

    if (!id || id === 'new') {
      // For new task, add file field
      setFields([...fields, {
        id: `temp-${Date.now()}`,
        fieldName: file.filename,
        fieldType: 'file',
        fieldValue: { filename: file.filename, path: file.path, url: file.url },
        orderIndex: fields.length,
        taskId: '',
        createdAt: new Date().toISOString(),
      } as TaskField])
      return
    }

    try {
      // Add file field to existing task
      await addFieldMutation.mutateAsync({
        taskId: id,
        data: {
          fieldName: file.filename,
          fieldType: 'file',
          fieldValue: { filename: file.filename, path: file.path, url: file.url },
          orderIndex: fields.length,
        },
      })
    } catch (error) {
      handleError(error, 'Failed to upload file')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 skeleton w-48"></div>
        <div className="card">
          <div className="space-y-4">
            <div className="h-10 skeleton"></div>
            <div className="h-10 skeleton"></div>
            <div className="h-32 skeleton"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">
          {isEdit ? 'Edit Task' : 'Create Task'}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
                {errorDetails && (
                  <div className="mt-2 text-sm text-red-700">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(errorDetails, null, 2)}</pre>
                  </div>
                )}
              </div>
              <button
                onClick={clearError}
                className="ml-3 flex-shrink-0 text-red-400 hover:text-red-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              clearError()
            }}
            placeholder="Enter task title"
            error={error && !title.trim() ? 'Title is required' : undefined}
          />

          <Select
            label="Content Type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            options={CONTENT_TYPES}
          />

          {taskLists && (
            <Select
              label="Проект"
              value={listId || ''}
              onChange={(e) => setListId(e.target.value || null)}
              options={[
                { value: '', label: 'Без проекта' },
                ...taskLists.map(list => ({
                  value: list.id,
                  label: `${list.icon || ''} ${list.name}`.trim(),
                })),
              ]}
            />
          )}

          {/* Field Templates Section */}
          {!isEdit && fieldTemplates && fieldTemplates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шаблоны полей
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {fieldTemplates.map((template) => (
                  <label
                    key={template.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplates([...selectedTemplates, template.id])
                        } else {
                          setSelectedTemplates(selectedTemplates.filter(id => id !== template.id))
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {template.icon && <span className="mr-1">{template.icon}</span>}
                      {template.fieldName}
                    </span>
                  </label>
                ))}
              </div>
              {selectedTemplates.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Выбрано шаблонов: {selectedTemplates.length}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Fields</label>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingField(undefined)
                  setIsFieldEditorOpen(true)
                }}
              >
                + Add Field
              </Button>
            </div>

            <div className="space-y-2">
              {fields.length === 0 ? (
                <p className="text-sm text-gray-500">No fields added yet</p>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{field.fieldName}</span>
                      <span className="ml-2 text-sm text-gray-500">({field.fieldType})</span>
                      {field.fieldType !== 'file' && field.fieldType !== 'checkbox' && (
                        <div className="text-sm text-gray-600 mt-1">
                          {field.fieldValue?.value || 'No value'}
                        </div>
                      )}
                      {field.fieldType === 'checkbox' && (
                        <div className="text-sm text-gray-600 mt-1">
                          {field.fieldValue?.checked ? 'Checked' : 'Unchecked'}
                        </div>
                      )}
                      {field.fieldType === 'file' && field.fieldValue?.url && (
                        <div className="mt-2">
                          <MediaPreview
                            url={field.fieldValue.url}
                            filename={field.fieldValue.filename}
                            className="w-full h-32"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingField(field)
                          setIsFieldEditorOpen(true)
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleFieldDelete(field.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Files
            </label>
            <FileUpload
              onUploadComplete={handleFileUpload}
              accept="image/*,video/*,application/pdf"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </div>

      <FieldEditor
        isOpen={isFieldEditorOpen}
        onClose={() => {
          setIsFieldEditorOpen(false)
          setEditingField(undefined)
        }}
        onSave={handleFieldSave}
        field={editingField}
      />

      <FieldTemplatesManager />
    </div>
  )
}

