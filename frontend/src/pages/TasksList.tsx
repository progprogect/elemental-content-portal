import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { tasksApi, taskListsApi, tableColumnsApi, fieldsApi, TableColumn } from '../services/api/tasks'
import Button from '../components/ui/Button'
import TableColumnManager from '../components/TableColumnManager'
import TableColumnHeader from '../components/TableColumnHeader'
import TableCellEditor from '../components/TableCellEditor'
import Modal from '../components/ui/Modal'
import FieldEditor from '../components/FieldEditor'

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
    }),
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
      <div className="hidden md:block card overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Content Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4 + (columns?.length || 0) + 2} className="px-6 py-4 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.list && (
                        <div className="text-xs text-gray-400 mt-1">
                          {task.list.icon} {task.list.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{task.contentType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </td>
                    {columns?.map((column) => {
                      const field = getFieldForColumn(task, column.fieldName)
                      if (!field) {
                        return (
                          <td key={column.id} className="px-2 py-2 min-w-[200px] max-w-[400px]">
                            <div className="px-2 py-1 text-sm text-gray-400">-</div>
                          </td>
                        )
                      }
                      return (
                        <td key={column.id} className="px-2 py-2 min-w-[200px] max-w-[400px]">
                          <TableCellEditor
                            field={field}
                            onSave={handleFieldSave}
                          />
                        </td>
                      )
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white z-10">
                      <button
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
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
          tasks.map((task) => (
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
                {task.contentType} • {new Date(task.createdAt).toLocaleDateString()}
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
