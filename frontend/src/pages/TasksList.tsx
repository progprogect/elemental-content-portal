import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { tasksApi, taskListsApi, tableColumnsApi, fieldsApi, platformsApi, publicationsApi, TableColumn, Task } from '../services/api/tasks'
import Button from '../components/ui/Button'
import TableColumnManager from '../components/TableColumnManager'
import TableColumnHeader from '../components/TableColumnHeader'
import TableCellEditor from '../components/TableCellEditor'
import Modal from '../components/ui/Modal'
import FieldEditor from '../components/FieldEditor'
import ExpandableTaskRow from '../components/ExpandableTaskRow'

// Utility function to group tasks by month
function groupTasksByMonth(tasks: Task[]): Array<{ monthKey: string; monthLabel: string; tasks: Task[] }> {
  const groups: Record<string, Task[]> = {}
  
  tasks.forEach(task => {
    try {
      const date = new Date(task.scheduledDate)
      if (isNaN(date.getTime())) {
        console.warn(`Invalid scheduledDate for task ${task.id}: ${task.scheduledDate}`)
        return
      }
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(task)
    } catch (error) {
      console.warn(`Error processing scheduledDate for task ${task.id}:`, error)
    }
  })
  
  // Sort months chronologically (earliest first)
  const sortedMonths = Object.keys(groups).sort()
  
  return sortedMonths.map(monthKey => {
    const date = new Date(monthKey + '-01')
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    // Tasks are already sorted by scheduledDate from backend, but ensure they're sorted
    const sortedTasks = groups[monthKey].sort((a, b) => {
      try {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      } catch {
        return 0
      }
    })
    return {
      monthKey,
      monthLabel,
      tasks: sortedTasks,
    }
  })
}

// Utility function to format date for display
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${dayOfWeek}, ${dateFormatted}`
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Invalid date'
  }
}

export default function TasksList() {
  const navigate = useNavigate()
  const { listId } = useParams<{ listId?: string }>()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [editingColumn, setEditingColumn] = useState<TableColumn | null>(null)
  const [deleteConfirmColumn, setDeleteConfirmColumn] = useState<TableColumn | null>(null)
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false)

  // Get current list info
  const { data: currentList } = useQuery({
    queryKey: ['task-list', listId],
    queryFn: () => taskListsApi.getLists().then(lists => lists.find(l => l.id === listId)),
    enabled: !!listId,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', page, listId],
    queryFn: () => tasksApi.getTasks({
      page,
      limit: 20,
      listId: listId || undefined,
      include: 'publications',
    }),
  })

  // Get platforms
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: platformsApi.getPlatforms,
  })

  const { data: columns } = useQuery({
    queryKey: ['table-columns'],
    queryFn: tableColumnsApi.getColumns,
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ taskId, fieldId, value }: { taskId: string; fieldId: string; value: any }) =>
      fieldsApi.updateField(taskId, fieldId, { fieldValue: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleFieldSave = async (fieldId: string, value: any) => {
    const task = tasks.find(t => t.fields.some(f => f.id === fieldId))
    if (!task) return

    await updateFieldMutation.mutateAsync({
      taskId: task.id,
      fieldId,
      value,
    })
  }

  const getFieldForColumn = (task: typeof tasks[0], columnFieldName: string) => {
    return task.fields.find(f => f.fieldName === columnFieldName)
  }

  const deleteMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteColumnMutation = useMutation({
    mutationFn: tableColumnsApi.deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-columns'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDeleteConfirmColumn(null)
    },
  })

  const handleEditColumn = (column: TableColumn) => {
    setEditingColumn(column)
    setIsColumnEditorOpen(true)
  }

  const handleDeleteColumn = (column: TableColumn) => {
    setDeleteConfirmColumn(column)
  }

  const handleSaveColumn = async (fieldData: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
  }) => {
    if (editingColumn) {
      await tableColumnsApi.updateColumn(editingColumn.id, {
        fieldName: fieldData.fieldName,
        fieldType: fieldData.fieldType,
        defaultValue: fieldData.fieldValue,
      })
    }
    queryClient.invalidateQueries({ queryKey: ['table-columns'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    setIsColumnEditorOpen(false)
    setEditingColumn(null)
  }

  const confirmDeleteColumn = () => {
    if (deleteConfirmColumn) {
      deleteColumnMutation.mutate(deleteConfirmColumn.id)
    }
  }

  const tasks = data?.tasks || []
  const pagination = data?.pagination
  const groupedTasks = groupTasksByMonth(tasks)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 skeleton w-48"></div>
        <div className="card">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error loading tasks</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            {currentList ? (
              <>
                {currentList.icon && <span className="mr-2">{currentList.icon}</span>}
                {currentList.name}
              </>
            ) : listId === 'null' || listId === 'unassigned' ? (
              'No Project'
            ) : (
              'All Tasks'
            )}
          </h2>
          {currentList && currentList.stats && (
            <div className="mt-2 flex gap-4 text-sm text-gray-500">
              <span>Всего: {currentList.taskCount || 0}</span>
              {currentList.stats.draft > 0 && <span>Черновики: {currentList.stats.draft}</span>}
              {currentList.stats.in_progress > 0 && <span>В работе: {currentList.stats.in_progress}</span>}
              {currentList.stats.completed > 0 && <span>Завершено: {currentList.stats.completed}</span>}
            </div>
          )}
        </div>
        <Button onClick={() => navigate('/tasks/new')}>
          + New Task
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[180px] border-r border-gray-200">
                  Scheduled Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[250px]">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                  Content Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[140px]">
                  Created
                </th>
                {columns?.map((column) => (
                  <TableColumnHeader
                    key={column.id}
                    column={column}
                    onEdit={handleEditColumn}
                    onDelete={handleDeleteColumn}
                  />
                ))}
                <TableColumnManager onColumnChange={() => queryClient.invalidateQueries({ queryKey: ['table-columns'] })} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px] bg-gray-100 border-l-2 border-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5 + (columns?.length || 0) + 2 + 1} className="px-6 py-4 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                groupedTasks.map((group) => (
                  <>
                    {/* Month Header Row */}
                    <tr key={`month-${group.monthKey}`} className="bg-gray-100 border-t-2 border-gray-300">
                      <td 
                        colSpan={5 + (columns?.length || 0) + 2 + 1} 
                        className="px-6 py-3 sticky left-0 bg-gray-100 z-10 border-r border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{group.monthLabel}</span>
                          <span className="text-xs text-gray-500">({group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'})</span>
                        </div>
                      </td>
                    </tr>
                    {/* Tasks for this month */}
                    {group.tasks.map((task) => {
                      const hasPublications = task.publications && task.publications.length > 0
                      
                      if (hasPublications && platforms) {
                        return (
                          <ExpandableTaskRow
                            key={task.id}
                            task={task}
                            platforms={platforms}
                            columnsCount={columns?.length || 0}
                            onEdit={(publicationId) => {
                              navigate(`/tasks/${task.id}`, { state: { editPublicationId: publicationId } })
                            }}
                            onDelete={async (publicationId) => {
                              if (window.confirm('Delete this publication?')) {
                                try {
                                  await publicationsApi.deletePublication(task.id, publicationId)
                                  queryClient.invalidateQueries({ queryKey: ['tasks'] })
                                } catch (error) {
                                  console.error('Failed to delete publication:', error)
                                }
                              }
                            }}
                            onTaskView={() => navigate(`/tasks/${task.id}`)}
                            onTaskDelete={() => deleteMutation.mutate(task.id)}
                            formatDate={formatDate}
                          />
                        )
                      }
                      
                      // Regular row for tasks without publications
                      return (
                        <tr 
                          key={task.id} 
                          className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
                        >
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200 text-sm text-gray-600">
                            {formatDate(task.scheduledDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            {task.list && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                {task.list.icon && <span>{task.list.icon}</span>}
                                <span>{task.list.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-medium">{task.contentType}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </td>
                      {columns?.map((column) => {
                        const field = getFieldForColumn(task, column.fieldName)
                        if (!field) {
                          return (
                            <td key={column.id} className="px-6 py-4 min-w-[200px] max-w-[400px]">
                              <div className="text-sm text-gray-400">-</div>
                            </td>
                          )
                        }
                        return (
                          <td key={column.id} className="px-6 py-4 min-w-[200px] max-w-[400px]">
                            <TableCellEditor
                              field={field}
                              onSave={handleFieldSave}
                            />
                          </td>
                        )
                      })}
                      {/* Empty cell for Add Column button column */}
                      <td className="px-6 py-4 min-w-[200px] bg-gray-50 border-r border-gray-200"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-gray-50 border-l-2 border-gray-300">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(task.id)}
                            className="text-red-600 hover:text-red-700 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                        </tr>
                      )
                    })}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {tasks.length === 0 ? (
          <div className="card text-center text-gray-500">No tasks found</div>
        ) : (
          groupedTasks.map((group) => (
            <div key={`month-${group.monthKey}`}>
              {/* Month Header */}
              <div className="mb-3 px-4 py-2 bg-gray-100 rounded-lg border-l-4 border-primary-500">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{group.monthLabel}</span>
                  <span className="text-xs text-gray-500">({group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'})</span>
                </div>
              </div>
              {/* Tasks for this month */}
              <div className="space-y-4">
                {group.tasks.map((task) => (
                  <div key={task.id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                        {task.list && (
                          <div className="text-xs text-gray-400 mt-1">
                            {task.list.icon} {task.list.name}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 text-xs leading-5 font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      {task.contentType} • Scheduled: {formatDate(task.scheduledDate)} • Created: {new Date(task.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={() => deleteMutation.mutate(task.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Column Editor Modal */}
      <FieldEditor
        isOpen={isColumnEditorOpen}
        onClose={() => {
          setIsColumnEditorOpen(false)
          setEditingColumn(null)
        }}
        onSave={handleSaveColumn}
        field={editingColumn ? {
          id: editingColumn.id,
          fieldName: editingColumn.fieldName,
          fieldType: editingColumn.fieldType,
          fieldValue: editingColumn.defaultValue || (editingColumn.fieldType === 'checkbox' ? { checked: false } : { value: '' }),
          orderIndex: editingColumn.orderIndex,
          taskId: '',
          createdAt: '',
        } : undefined}
      />

      {/* Delete Column Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmColumn}
        onClose={() => setDeleteConfirmColumn(null)}
        title="Удалить колонку?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmColumn(null)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteColumn}
              disabled={deleteColumnMutation.isPending}
              className="ml-3"
            >
              {deleteColumnMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Вы уверены, что хотите удалить колонку <strong>"{deleteConfirmColumn?.fieldName}"</strong>?
        </p>
        <p className="text-sm text-red-600 mt-2">
          Внимание: Все значения этой колонки будут удалены у всех задач.
        </p>
      </Modal>
    </div>
  )
}
