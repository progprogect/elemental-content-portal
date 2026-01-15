import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskListsApi, TaskList } from '../services/api/tasks'
import { Bars3Icon, XMarkIcon, PlusIcon, Cog6ToothIcon, PhotoIcon, VideoCameraIcon, AcademicCapIcon, Squares2X2Icon, LanguageIcon, FilmIcon, SpeakerWaveIcon, MicrophoneIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Input from './ui/Input'
import ContextMenu, { MenuOption } from './ui/ContextMenu'
import logo from '../assets/logo.jpeg'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
  onOpenVideoWizard?: () => void
  onOpenImageGeneration?: () => void
  onOpenTextToSpeech?: () => void
  onOpenVoiceCloning?: () => void
}

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose, onOpenVideoWizard, onOpenImageGeneration, onOpenTextToSpeech, onOpenVoiceCloning }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListName, setEditingListName] = useState('')
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

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

  const updateListMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => taskListsApi.updateList(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] })
      setEditingListId(null)
      setEditingListName('')
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      alert(error.response?.data?.error || 'Failed to update project')
    },
  })

  const deleteListMutation = useMutation({
    mutationFn: taskListsApi.deleteList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] })
      // If deleted project was active, redirect to home
      // Use deletingListId from closure before it's cleared
      const deletedId = deletingListId
      if (deletedId === currentListId) {
        navigate('/')
      }
      setDeletingListId(null)
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      alert(error.response?.data?.error || 'Failed to delete project')
    },
  })

  // Get current list ID from URL
  const currentListId = location.pathname.startsWith('/lists/') 
    ? location.pathname.split('/')[2]?.split('?')[0]
    : null
  
  // Check if Settings page is active
  const isSettingsActive = location.pathname === '/settings'
  
  // Check if Learning Materials page is active
  const isLearningMaterialsActive = location.pathname.startsWith('/learning-materials')
  
  // Check if Gallery page is active
  const isGalleryActive = location.pathname === '/gallery'
  
  // Check if Stock Media page is active
  const isStockMediaActive = location.pathname === '/stock-media'

  // Check if Scene Generation page is active
  const isSceneGenerationActive = location.pathname.startsWith('/scene-generation')

  const handleListClick = (listId: string) => {
    navigate(`/lists/${listId}`)
    onMobileClose()
  }

  const handleCreateList = () => {
    if (!newListName.trim()) return
    createListMutation.mutate({ name: newListName.trim() })
  }

  const handleEditClick = (list: TaskList) => {
    setEditingListId(list.id)
    setEditingListName(list.name)
  }

  const handleDeleteClick = (list: TaskList) => {
    setDeletingListId(list.id)
  }

  const handleSaveEdit = () => {
    if (!editingListName.trim() || !editingListId) return
    updateListMutation.mutate({ id: editingListId, name: editingListName.trim() })
  }

  const handleConfirmDelete = () => {
    if (!deletingListId) return
    deleteListMutation.mutate(deletingListId)
  }

  const getTotalTaskCount = (list: TaskList) => {
    return list.taskCount || 0
  }

  // Content generation options configuration
  const contentGenerationOptions = [
    {
      id: 'generate-image',
      name: 'Generate Image',
      url: '',
      icon: PhotoIcon,
    },
    {
      id: 'text-to-speech',
      name: 'Text to Speech',
      url: '',
      icon: SpeakerWaveIcon,
    },
    {
      id: 'clone-voice',
      name: 'Clone Voice',
      url: '',
      icon: MicrophoneIcon,
    },
    {
      id: 'talking-head',
      name: 'Generate Talking Head from Photo',
      url: 'https://app.heygen.com/templates?ct=explainer%2520video&shortcut=photo-to-video',
      icon: PhotoIcon,
    },
    {
      id: 'video-from-video',
      name: 'Generate Video from Original Video',
      url: 'https://app.heygen.com/video-agent',
      icon: VideoCameraIcon,
    },
    {
      id: 'translate-video',
      name: 'Translate Video',
      url: 'https://app.heygen.com/apps?shortcut=translate-video',
      icon: LanguageIcon,
    },
  ]

  const handleContentGenerationClick = (optionId: string, url: string) => {
    if (optionId === 'generate-image' && onOpenImageGeneration) {
      // Open image generation modal
      onOpenImageGeneration()
      onMobileClose()
    } else if (optionId === 'text-to-speech' && onOpenTextToSpeech) {
      // Open text to speech modal
      onOpenTextToSpeech()
      onMobileClose()
    } else if (optionId === 'clone-voice' && onOpenVoiceCloning) {
      // Open voice cloning modal
      onOpenVoiceCloning()
      onMobileClose()
    } else if (optionId === 'video-from-video' && onOpenVideoWizard) {
      // Open wizard for video generation
      onOpenVideoWizard()
      onMobileClose()
    } else {
      // Direct redirect for other options
      window.open(url, '_blank', 'noopener,noreferrer')
      onMobileClose()
    }
  }

  return (
    <>
      <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${isMobileOpen ? 'fixed inset-y-0 left-0 z-50 shadow-lg' : 'hidden md:flex'} flex-col h-screen overflow-hidden`}>
        {/* Logo Header */}
        <div className="p-4 flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <div className="flex items-center flex-1 min-w-0">
                <img src={logo} alt="Logo" className="h-8 w-auto flex-shrink-0" />
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
            <div className="w-full flex justify-center">
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Expand sidebar"
              >
                <Bars3Icon className="h-5 w-5" />
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

                  const menuOptions: MenuOption[] = [
                    {
                      label: 'Edit',
                      onClick: () => handleEditClick(list),
                      variant: 'default',
                    },
                    {
                      label: 'Delete',
                      onClick: () => handleDeleteClick(list),
                      variant: 'danger',
                    },
                  ]

                  return (
                    <li key={list.id} className="group">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleListClick(list.id)}
                          className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                        {!isCollapsed && (
                          <ContextMenu
                            options={menuOptions}
                            position="right"
                            className="flex-shrink-0"
                            trigger={
                              <button
                                className="p-1 rounded hover:bg-gray-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                aria-label="Project options"
                                type="button"
                              >
                                <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                              </button>
                            }
                          />
                        )}
                      </div>
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

          {/* Learning Materials Section */}
          <div className="px-2 py-2 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Learning
              </h2>
            )}
            <button
              onClick={() => {
                navigate('/learning-materials')
                onMobileClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLearningMaterialsActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AcademicCapIcon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Learning Materials</span>}
            </button>
          </div>

          {/* Gallery Section */}
          <div className="px-2 py-2 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Media
              </h2>
            )}
            <button
              onClick={() => {
                navigate('/gallery')
                onMobileClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isGalleryActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Squares2X2Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Gallery</span>}
            </button>
            <button
              onClick={() => {
                navigate('/stock-media')
                onMobileClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isStockMediaActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FilmIcon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Stock Media</span>}
            </button>
          </div>

          {/* Generation Section */}
          <div className="px-2 py-2 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Generation
              </h2>
            )}
            <button
              onClick={() => {
                navigate('/scene-generation')
                onMobileClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSceneGenerationActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FilmIcon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Scene Generation</span>}
            </button>
          </div>

          {/* Content Generation Section */}
          <div className="px-2 py-2 border-t border-gray-200">
            {!isCollapsed && (
              <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Content Generation
              </h2>
            )}
            <ul className="space-y-1">
              {contentGenerationOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <li key={option.id}>
                    <button
                      onClick={() => handleContentGenerationClick(option.id, option.url)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50"
                    >
                      <IconComponent className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="flex-1 text-left truncate">{option.name}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Settings Section */}
        <div className="px-2 py-2 border-t border-gray-200">
          {!isCollapsed && (
            <h2 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Settings
            </h2>
          )}
          <button
            onClick={() => {
              navigate('/settings')
              onMobileClose()
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSettingsActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="flex-1 text-left">Settings</span>}
          </button>
        </div>

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

      {/* Edit List Modal */}
      <Modal
        isOpen={editingListId !== null}
        onClose={() => {
          setEditingListId(null)
          setEditingListName('')
        }}
        title="Edit Project"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingListId(null)
                setEditingListName('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={!editingListName.trim() || updateListMutation.isPending}
              className="ml-3"
            >
              {updateListMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <Input
          label="Project Name"
          value={editingListName}
          onChange={(e) => setEditingListName(e.target.value)}
          placeholder="e.g., Social Media, Learning"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editingListName.trim() && !updateListMutation.isPending) {
              handleSaveEdit()
            }
            if (e.key === 'Escape') {
              setEditingListId(null)
              setEditingListName('')
            }
          }}
          autoFocus
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingListId !== null}
        onClose={() => setDeletingListId(null)}
        title="Delete Project"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeletingListId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteListMutation.isPending}
              className="ml-3"
            >
              {deleteListMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          <p className="text-sm text-gray-500">
            Tasks in this project will remain but will no longer be associated with this project.
          </p>
        </div>
      </Modal>
    </>
  )
}

