import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, fieldsApi, taskListsApi, tableColumnsApi, platformsApi, publicationsApi, TaskField, TaskPublication, CreatePublicationData, UpdatePublicationData } from '../services/api/tasks'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { getErrorMessage } from '../utils/error-handler'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import FieldEditor from '../components/FieldEditor'
import FileUpload from '../components/FileUpload'
import MediaPreview from '../components/MediaPreview'
import PlatformSelector from '../components/PlatformSelector'
import PublicationEditor from '../components/PublicationEditor'
import InlinePublicationEditor from '../components/InlinePublicationEditor'
import TableCellEditor from '../components/TableCellEditor'

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'text', label: 'Text' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

const STANDARD_CONTENT_TYPES = ['video', 'image', 'talking_head', 'text', 'presentation']

export default function TaskForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const isEdit = id && id !== 'new'

  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('video')
  const [customContentType, setCustomContentType] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [listId, setListId] = useState<string | null>(null)
  const [fields, setFields] = useState<TaskField[]>([])
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState<TaskField | undefined>()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [publications, setPublications] = useState<TaskPublication[]>([])
  const [expandedPublications, setExpandedPublications] = useState<Set<string>>(new Set())
  const [isPublicationEditorOpen, setIsPublicationEditorOpen] = useState(false)
  const [editingPublication, setEditingPublication] = useState<TaskPublication | undefined>()
  const [editingPlatformCode, setEditingPlatformCode] = useState<string | undefined>()
  const { error, errorDetails, handleError, clearError } = useErrorHandler()
  const columnsInitialized = useRef(false)

  // Get listId from URL if coming from a list page
  useEffect(() => {
    const listIdFromState = location.state?.listId
    if (listIdFromState && !isEdit) {
      setListId(listIdFromState)
    }
  }, [location.state, isEdit])

  // Get task lists
  const { data: taskLists } = useQuery({
    queryKey: ['task-lists'],
    queryFn: taskListsApi.getLists,
  })

  // Get table columns for new tasks
  const { data: tableColumns } = useQuery({
    queryKey: ['table-columns'],
    queryFn: tableColumnsApi.getColumns,
    enabled: !isEdit, // Only load for new tasks
  })

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id!, 'publications'),
    enabled: !!isEdit,
  })

  // Get platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: platformsApi.getPlatforms,
  })

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      // Check if contentType is a standard type or custom
      if (STANDARD_CONTENT_TYPES.includes(task.contentType)) {
        setContentType(task.contentType)
        setCustomContentType('')
      } else {
        setContentType('other')
        setCustomContentType(task.contentType)
      }
      setListId(task.listId || null)
      setFields(task.fields || [])
      setPublications(task.publications || [])
      setSelectedPlatforms((task.publications || []).map(p => p.platform))
      // Expand first publication by default
      if (task.publications && task.publications.length > 0) {
        setExpandedPublications(new Set([task.publications[0].id]))
      }
      // Convert ISO date to YYYY-MM-DD format for date input
      if (task.scheduledDate) {
        try {
          const date = new Date(task.scheduledDate)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            setScheduledDate(`${year}-${month}-${day}`)
          }
        } catch (error) {
          console.warn('Error parsing scheduledDate:', task.scheduledDate, error)
        }
      }
    }
  }, [task])

  // Sync publications with selectedPlatforms - remove publications for deselected platforms
  useEffect(() => {
    if (!isEdit) {
      setPublications(currentPublications => {
        // Remove publications for platforms that are no longer selected
        const publicationsToKeep = currentPublications.filter(p => selectedPlatforms.includes(p.platform))
        if (publicationsToKeep.length !== currentPublications.length) {
          // Clean up expandedPublications for removed platforms
          setExpandedPublications(currentExpanded => {
            const newExpanded = new Set(currentExpanded)
            currentPublications.forEach(p => {
              if (!selectedPlatforms.includes(p.platform)) {
                newExpanded.delete(p.id)
              }
            })
            return newExpanded
          })
        }
        return publicationsToKeep
      })
    }
  }, [selectedPlatforms, isEdit])

  // Initialize fields from table columns for new tasks
  useEffect(() => {
    if (!isEdit && tableColumns && tableColumns.length > 0) {
      setFields(currentFields => {
        // Get existing column field IDs
        const existingColumnIds = currentFields
          .filter(f => f.id.startsWith('column-'))
          .map(f => f.id.replace('column-', ''))
        
        // Find new columns that don't have fields yet
        const newColumns = tableColumns.filter(
          column => !existingColumnIds.includes(column.id)
        )
        
        // If there are new columns, add them to fields
        if (newColumns.length > 0) {
          const newFields: TaskField[] = newColumns.map((column, index) => {
            let fieldValue: any;
            if (column.defaultValue) {
              fieldValue = column.defaultValue;
            } else if (column.fieldType === 'checkbox') {
              fieldValue = { checked: false };
            } else {
              fieldValue = { value: '' };
            }

            return {
              id: `column-${column.id}`,
              fieldName: column.fieldName,
              fieldType: column.fieldType,
              fieldValue,
              orderIndex: currentFields.length + index,
              taskId: '',
              createdAt: new Date().toISOString(),
            } as TaskField;
          });
          return [...currentFields, ...newFields];
        }
        
        // If no fields exist yet, initialize all columns
        if (currentFields.length === 0 && !columnsInitialized.current) {
          const initialFields: TaskField[] = tableColumns.map((column, index) => {
            let fieldValue: any;
            if (column.defaultValue) {
              fieldValue = column.defaultValue;
            } else if (column.fieldType === 'checkbox') {
              fieldValue = { checked: false };
            } else {
              fieldValue = { value: '' };
            }

            return {
              id: `column-${column.id}`,
              fieldName: column.fieldName,
              fieldType: column.fieldType,
              fieldValue,
              orderIndex: index,
              taskId: '',
              createdAt: new Date().toISOString(),
            } as TaskField;
          });
          columnsInitialized.current = true;
          return initialFields;
        }
        
        return currentFields;
      });
    }
  }, [tableColumns, isEdit])

  // Reset initialization flag when switching between edit/new mode
  useEffect(() => {
    if (isEdit) {
      columnsInitialized.current = false;
    }
  }, [isEdit])

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

  const createPublicationMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreatePublicationData }) =>
      publicationsApi.createPublication(taskId, data),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to create publication')
    },
  })

  const updatePublicationMutation = useMutation({
    mutationFn: ({ taskId, publicationId, data }: { taskId: string; publicationId: string; data: UpdatePublicationData }) =>
      publicationsApi.updatePublication(taskId, publicationId, data),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to update publication')
    },
  })

  const deletePublicationMutation = useMutation({
    mutationFn: ({ taskId, publicationId }: { taskId: string; publicationId: string }) =>
      publicationsApi.deletePublication(taskId, publicationId),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      }
      clearError()
    },
    onError: (error) => {
      handleError(error, 'Failed to delete publication')
    },
  })

  const handleSave = async () => {
    if (!title.trim()) {
      handleError(new Error('Title is required'), 'Please enter a task title')
      return
    }

    if (!scheduledDate) {
      handleError(new Error('Scheduled date is required'), 'Please select a scheduled date')
      return
    }

    clearError()

    // Convert YYYY-MM-DD to ISO datetime string (using local timezone to avoid timezone issues)
    const [year, month, day] = scheduledDate.split('-')
    const scheduledDateISO = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString()

    // Determine final contentType
    const finalContentType = contentType === 'other' ? customContentType : contentType
    
    if (contentType === 'other' && !customContentType.trim()) {
      handleError(new Error('Custom content type is required'), 'Please enter a custom content type')
      return
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: { title, contentType: finalContentType, listId, scheduledDate: scheduledDateISO },
        })
      } else {
        const newTask = await createMutation.mutateAsync({
          title,
          contentType: finalContentType,
          listId: listId || null,
          scheduledDate: scheduledDateISO,
        })
        
        // Fields are automatically created on backend for all table columns
        // Update field values if user modified them in the form
        if (newTask.id && fields.length > 0) {
          // Reload task to get all fields created by backend
          const updatedTask = await tasksApi.getTask(newTask.id)
          
          // Update fields that were modified in the form
          const columnFields = fields.filter(f => f.id.startsWith('column-'))
          const failedFields: Array<{ field: TaskField; error: string }> = []
          
          for (const formField of columnFields) {
            // Find corresponding field in the created task
            const taskField = updatedTask.fields.find(
              f => f.fieldName === formField.fieldName
            )
            
            if (taskField) {
              // Check if value was modified from default
              const formValue = JSON.stringify(formField.fieldValue)
              const taskValue = JSON.stringify(taskField.fieldValue)
              
              if (formValue !== taskValue) {
                try {
                  await updateFieldMutation.mutateAsync({
                    taskId: newTask.id,
                    fieldId: taskField.id,
                    data: { fieldValue: formField.fieldValue },
                  })
                } catch (fieldError) {
                  const errorMessage = getErrorMessage(fieldError)
                  failedFields.push({ field: formField, error: errorMessage })
                  console.error(`Failed to update field "${formField.fieldName}":`, fieldError)
                }
              }
            }
          }
          
          // Add any additional non-column fields
          const additionalFields = fields.filter(f => !f.id.startsWith('column-'))
          for (const field of additionalFields) {
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
              new Error(`Failed to update/add some fields: ${failedNames}`),
              `Task created successfully, but ${failedFields.length} field(s) could not be updated: ${failedNames}. You can edit them manually.`
            )
            // Still navigate to task page so user can edit fields manually
            navigate(`/tasks/${newTask.id}`)
            return
          }
        }

        // Create publications for selected platforms
        if (newTask.id && (selectedPlatforms.length > 0 || publications.length > 0) && platforms) {
          const failedPublications: Array<{ platform: string; error: string }> = []
          
          // Use publications from state if available, otherwise create from selectedPlatforms
          const publicationsToCreate = publications.length > 0 
            ? publications 
            : selectedPlatforms.map((platformCode, i) => ({
                platform: platformCode,
                contentType: finalContentType,
                executionType: 'manual' as const,
                status: 'draft' as const,
                orderIndex: i,
              }))
          
          for (let i = 0; i < publicationsToCreate.length; i++) {
            const pub = publicationsToCreate[i]
            const platform = platforms.find(p => p.code === pub.platform)
            
            try {
              await createPublicationMutation.mutateAsync({
                taskId: newTask.id,
                data: {
                              platform: pub.platform,
                              contentType: pub.contentType || finalContentType,
                              executionType: pub.executionType || 'manual',
                  status: pub.status || 'draft',
                  note: ('note' in pub ? pub.note : null) || null,
                  content: ('content' in pub ? pub.content : null) || null,
                  orderIndex: pub.orderIndex !== undefined ? pub.orderIndex : i,
                },
              })
            } catch (pubError) {
              const errorMessage = getErrorMessage(pubError)
              failedPublications.push({ platform: platform?.name || pub.platform, error: errorMessage })
              console.error(`Failed to create publication for "${pub.platform}":`, pubError)
            }
          }
          
          if (failedPublications.length > 0) {
            const failedNames = failedPublications.map(p => p.platform).join(', ')
            handleError(
              new Error(`Failed to create some publications: ${failedNames}`),
              `Task created successfully, but ${failedPublications.length} publication(s) could not be created: ${failedNames}. You can add them manually.`
            )
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

          <div>
            <Select
              label="Content Type"
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value)
                if (e.target.value !== 'other') {
                  setCustomContentType('')
                }
              }}
              options={CONTENT_TYPES}
            />
            {contentType === 'other' && (
              <div className="mt-2">
                <Input
                  label="Custom Content Type"
                  value={customContentType}
                  onChange={(e) => setCustomContentType(e.target.value)}
                  placeholder="Enter custom content type..."
                  required
                />
              </div>
            )}
          </div>

          <Input
            label="Scheduled Date"
            type="date"
            value={scheduledDate}
            onChange={(e) => {
              setScheduledDate(e.target.value)
              clearError()
            }}
            required
            error={error && !scheduledDate ? 'Scheduled date is required' : undefined}
          />

          {taskLists && (
            <Select
              label="Project"
              value={listId || ''}
              onChange={(e) => setListId(e.target.value || null)}
              options={[
                { value: '', label: 'No Project' },
                ...taskLists.map(list => ({
                  value: list.id,
                  label: `${list.icon || ''} ${list.name}`.trim(),
                })),
              ]}
            />
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
                <>
                  {/* Table column fields */}
                  {fields.filter(f => f.id.startsWith('column-')).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        Table Columns
                      </p>
                      <div className="space-y-2">
                        {fields
                          .filter(f => f.id.startsWith('column-'))
                          .map((field) => (
                            <div key={field.id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {tableColumns?.find(c => c.fieldName === field.fieldName)?.icon && (
                                    <span>{tableColumns.find(c => c.fieldName === field.fieldName)?.icon}</span>
                                  )}
                                  <span className="font-medium text-gray-900">{field.fieldName}</span>
                                </div>
                                {field.fieldType === 'file' ? (
                                  <div>
                                    {field.fieldValue?.url && (
                                      <MediaPreview
                                        url={field.fieldValue.url}
                                        filename={field.fieldValue.filename}
                                        className="w-full h-48"
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <TableCellEditor
                                    field={field}
                                    onSave={async (fieldId, value) => {
                                      if (isEdit && id) {
                                        await updateFieldMutation.mutateAsync({
                                          taskId: id,
                                          fieldId,
                                          data: { fieldValue: value },
                                        })
                                      } else {
                                        setFields(fields.map(f => 
                                          f.id === fieldId ? { ...f, fieldValue: value } : f
                                        ))
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional fields */}
                  {fields.filter(f => !f.id.startsWith('column-')).length > 0 && (
                    <div>
                      <div className="space-y-2">
                        {fields
                          .filter(f => !f.id.startsWith('column-'))
                          .map((field) => (
                            <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-700 mb-2">{field.fieldName}</div>
                                {field.fieldType === 'file' ? (
                                  <div>
                                    {field.fieldValue?.url && (
                                      <div className="relative">
                                        <MediaPreview
                                          url={field.fieldValue.url}
                                          filename={field.fieldValue.filename}
                                          className="w-full h-48"
                                        />
                                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingField(field)
                                              setIsFieldEditorOpen(true)
                                            }}
                                            className="px-2 py-1 bg-white bg-opacity-90 hover:bg-opacity-100 text-primary-600 hover:text-primary-700 text-xs font-medium rounded shadow-sm transition-all"
                                            title="Edit field"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleFieldDelete(field.id)
                                            }}
                                            className="px-2 py-1 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 hover:text-red-700 text-xs font-medium rounded shadow-sm transition-all"
                                            title="Delete field"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <TableCellEditor
                                        field={field}
                                        onSave={async (fieldId, value) => {
                                          if (isEdit && id) {
                                            await updateFieldMutation.mutateAsync({
                                              taskId: id,
                                              fieldId,
                                              data: { fieldValue: value },
                                            })
                                          } else {
                                            setFields(fields.map(f => 
                                              f.id === fieldId ? { ...f, fieldValue: value } : f
                                            ))
                                          }
                                        }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleFieldDelete(field.id)}
                                      className="text-red-600 hover:text-red-700 text-sm px-2 py-1"
                                      title="Delete field"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
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

          {/* Platforms and Publications Section */}
          {platforms && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4">Social Media Platforms</h3>
              
              {!isEdit && (
                <div className="mb-4">
                  <PlatformSelector
                    platforms={platforms}
                    selectedPlatforms={selectedPlatforms}
                    onChange={setSelectedPlatforms}
                    label="Select platforms for this task"
                  />
                </div>
              )}

              {/* Publications - Inline Editors */}
              {((isEdit && publications.length > 0) || (!isEdit && selectedPlatforms.length > 0)) && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      {isEdit ? 'Publications' : `Publications (${selectedPlatforms.length})`}
                    </h4>
                    {isEdit && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingPublication(undefined)
                          setEditingPlatformCode(undefined)
                          setIsPublicationEditorOpen(true)
                        }}
                      >
                        + Add Publication
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {isEdit ? (
                      // Existing publications for edit mode
                      publications.map((publication) => {
                        const platform = platforms.find(p => p.code === publication.platform)
                        if (!platform) return null
                        const isExpanded = expandedPublications.has(publication.id)
                        return (
                          <InlinePublicationEditor
                            key={publication.id}
                            platform={platform}
                            publication={publication}
                            defaultContentType={contentType}
                            isExpanded={isExpanded}
                            onToggle={() => {
                              const newExpanded = new Set(expandedPublications)
                              if (isExpanded) {
                                newExpanded.delete(publication.id)
                              } else {
                                newExpanded.add(publication.id)
                              }
                              setExpandedPublications(newExpanded)
                            }}
                            onUpdate={async (data) => {
                              if (id) {
                                await updatePublicationMutation.mutateAsync({
                                  taskId: id,
                                  publicationId: publication.id,
                                  data,
                                })
                              }
                            }}
                            onDelete={() => {
                              if (id && window.confirm(`Delete publication for ${platform.name}?`)) {
                                deletePublicationMutation.mutate({ taskId: id, publicationId: publication.id })
                              }
                            }}
                            canDelete={true}
                          />
                        )
                      })
                    ) : (
                      // New publications for create mode
                      selectedPlatforms.map((platformCode) => {
                        const platform = platforms.find(p => p.code === platformCode)
                        if (!platform) return null
                        const publication = publications.find(p => p.platform === platformCode)
                        const isExpanded = expandedPublications.has(platformCode)
                        return (
                          <InlinePublicationEditor
                            key={platformCode}
                            platform={platform}
                            publication={publication}
                            defaultContentType={contentType}
                            isExpanded={isExpanded}
                            onToggle={() => {
                              const newExpanded = new Set(expandedPublications)
                              if (isExpanded) {
                                newExpanded.delete(platformCode)
                              } else {
                                newExpanded.add(platformCode)
                              }
                              setExpandedPublications(newExpanded)
                            }}
                            onUpdate={(data) => {
                              if (publication) {
                                // Update existing publication in state
                                setPublications(publications.map(p => 
                                  p.id === publication.id ? { ...p, ...data } as TaskPublication : p
                                ))
                              } else {
                                // Create new publication in state
                                const newPublication: TaskPublication = {
                                  id: `temp-${Date.now()}`,
                                  taskId: '',
                                  platform: platformCode,
                                  contentType: data.contentType || contentType,
                                  executionType: data.executionType || 'manual',
                                  status: data.status || 'draft',
                                  note: data.note || null,
                                  content: data.content || null,
                                  orderIndex: publications.length,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                }
                                setPublications([...publications, newPublication])
                              }
                            }}
                            onDelete={() => {
                              if (publication) {
                                setPublications(publications.filter(p => p.id !== publication.id))
                              }
                              setSelectedPlatforms(selectedPlatforms.filter(code => code !== platformCode))
                              const newExpanded = new Set(expandedPublications)
                              newExpanded.delete(platformCode)
                              setExpandedPublications(newExpanded)
                            }}
                            canDelete={true}
                          />
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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

      {/* Publication Editor Modal */}
      {platforms && (
        <PublicationEditor
          isOpen={isPublicationEditorOpen}
          onClose={() => {
            setIsPublicationEditorOpen(false)
            setEditingPublication(undefined)
            setEditingPlatformCode(undefined)
          }}
          onSave={async (data) => {
            if (isEdit && id) {
              if (editingPublication) {
                await updatePublicationMutation.mutateAsync({
                  taskId: id,
                  publicationId: editingPublication.id,
                  data,
                })
              } else {
                if (!data.platform) {
                  throw new Error('Platform is required')
                }
                await createPublicationMutation.mutateAsync({
                  taskId: id,
                    data: {
                      platform: data.platform,
                      contentType: data.contentType || finalContentType,
                      executionType: data.executionType || 'manual',
                    status: data.status || 'draft',
                    note: data.note || null,
                    content: data.content || null,
                    orderIndex: publications.length,
                  },
                })
              }
            } else {
              // For new tasks, store in local state
              if (editingPublication) {
                setPublications(publications.map(p => 
                  p.id === editingPublication.id ? { ...p, ...data } as TaskPublication : p
                ))
              } else {
                const platformCode = editingPlatformCode || data.platform || ''
                const newPublication: TaskPublication = {
                  id: `temp-${Date.now()}`,
                  taskId: '',
                  platform: platformCode,
                  contentType: data.contentType || finalContentType,
                  executionType: data.executionType || 'manual',
                  status: data.status || 'draft',
                  note: data.note || null,
                  content: data.content || null,
                  orderIndex: publications.length,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                setPublications([...publications, newPublication])
                if (platformCode && !selectedPlatforms.includes(platformCode)) {
                  setSelectedPlatforms([...selectedPlatforms, platformCode])
                }
              }
            }
          }}
          publication={editingPublication}
          platform={editingPlatformCode ? platforms.find(p => p.code === editingPlatformCode) : undefined}
          platforms={platforms}
        />
      )}
    </div>
  )
}

