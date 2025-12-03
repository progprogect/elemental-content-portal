import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { tasksApi, taskListsApi } from '../services/api/tasks'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'talking_head', label: 'Talking Head' },
  { value: 'text', label: 'Text' },
  { value: 'presentation', label: 'Presentation' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export default function TasksList() {
  const navigate = useNavigate()
  const { listId } = useParams<{ listId?: string }>()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState('')
  const [showStatusFilter, setShowStatusFilter] = useState(false)

  // Get current list info
  const { data: currentList } = useQuery({
    queryKey: ['task-list', listId],
    queryFn: () => taskListsApi.getLists().then(lists => lists.find(l => l.id === listId)),
    enabled: !!listId,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', page, statusFilter, contentTypeFilter, listId],
    queryFn: () => tasksApi.getTasks({
      page,
      limit: 20,
      status: statusFilter || undefined,
      contentType: contentTypeFilter || undefined,
      listId: listId || undefined,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

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

  const tasks = data?.tasks || []
  const pagination = data?.pagination

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [listId, statusFilter, contentTypeFilter])

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
              'Без проекта'
            ) : (
              'Все задачи'
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

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Фильтры</h3>
          {listId && (
            <button
              onClick={() => setShowStatusFilter(!showStatusFilter)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {showStatusFilter ? 'Скрыть фильтр по статусу' : 'Показать фильтр по статусу'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(showStatusFilter || !listId) && (
            <Select
              label="Filter by Status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            />
          )}
          <Select
            label="Filter by Content Type"
            options={[
              { value: '', label: 'All Types' },
              ...CONTENT_TYPES,
            ]}
            value={contentTypeFilter}
            onChange={(e) => {
              setContentTypeFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
    </div>
  )
}
