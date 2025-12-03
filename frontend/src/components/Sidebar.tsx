import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskListsApi, TaskList } from '../services/api/tasks'
import { Bars3Icon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'
import logo from '../assets/logo.jpeg'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newListName, setNewListName] = useState('')

  const { data: lists, isLoading } = useQuery({
    queryKey: ['task-lists'],
    queryFn: taskListsApi.getLists,
  })

  const createListMutation = useMutation({
    mutationFn: taskListsApi.createList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] })
      setIsCreateModalOpen(false)
      setNewListName('')
    },
  })

  // Get current list ID from URL
  const currentListId = location.pathname.startsWith('/lists/') 
    ? location.pathname.split('/')[2]?.split('?')[0]
    : null

  const handleListClick = (listId: string) => {
    navigate(`/lists/${listId}`)
    onMobileClose()
  }

  const handleCreateList = () => {
    if (!newListName.trim()) return
    createListMutation.mutate({ name: newListName.trim() })
  }

  const getTotalTaskCount = (list: TaskList) => {
    return list.taskCount || 0
  }

  return (
    <>
      <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 shadow-lg' : 'hidden md:flex'} flex-col h-screen`}>
        {/* Logo Header */}
        <div className="p-4 flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={logo} alt="Logo" className="h-8 w-auto flex-shrink-0" />
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  Elemental
                </h1>
              </div>
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Expand sidebar"
              >
                <Bars3Icon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {/* Projects Section */}
          <div className="px-2 py-2">
            {!isCollapsed && (
              <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Projects
              </h2>
            )}
            {isLoading ? (
              <div className="px-3 py-2">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : lists && lists.length > 0 ? (
              <ul className="space-y-1">
                {lists.map((list) => {
                  const isActive = currentListId === list.id
                  const taskCount = getTotalTaskCount(list)

                  return (
                    <li key={list.id}>
                      <button
                        onClick={() => handleListClick(list.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {list.icon && <span className="text-lg flex-shrink-0">{list.icon}</span>}
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{list.name}</span>
                            {taskCount > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {taskCount}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              !isCollapsed && (
                <p className="text-sm text-gray-500 px-3 py-2">No projects</p>
              )
            )}
          </div>
        </nav>

        {/* Create Button */}
        <div className="p-4 border-t border-gray-200">
          {!isCollapsed ? (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full"
            >
              <PlusIcon className="h-4 w-4 mr-2 inline" />
              New Project
            </Button>
          ) : (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Create new project"
            >
              <PlusIcon className="h-5 w-5 mx-auto" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Create List Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setNewListName('')
        }}
        title="Create New Project"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false)
                setNewListName('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateList}
              disabled={!newListName.trim() || createListMutation.isPending}
              className="ml-3"
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Project Name"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="e.g., Social Media, Learning"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newListName.trim()) {
              handleCreateList()
            }
          }}
        />
      </Modal>
    </>
  )
}

