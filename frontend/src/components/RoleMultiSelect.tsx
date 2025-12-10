import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingRolesApi, TrainingRole } from '../services/api/training'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import Button from './ui/Button'

interface RoleMultiSelectProps {
  selectedRoleIds: string[]
  onChange: (roleIds: string[]) => void
  label?: string
  error?: string
}

export default function RoleMultiSelect({ selectedRoleIds, onChange, label, error }: RoleMultiSelectProps) {
  const [newRoleName, setNewRoleName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  // Fetch all roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['training-roles'],
    queryFn: trainingRolesApi.getRoles,
  })

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: trainingRolesApi.createRole,
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['training-roles'] })
      // Add new role to selection
      onChange([...selectedRoleIds, newRole.id])
      setNewRoleName('')
      setIsCreating(false)
    },
    onError: (error: any) => {
      console.error('Failed to create role:', error)
      alert(error.response?.data?.error || 'Failed to create role')
    },
  })

  const selectedRoles = roles.filter(role => selectedRoleIds.includes(role.id))

  const handleToggleRole = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId))
    } else {
      onChange([...selectedRoleIds, roleId])
    }
  }

  const handleRemoveRole = (roleId: string) => {
    onChange(selectedRoleIds.filter(id => id !== roleId))
  }

  const handleCreateRole = async () => {
    const trimmedName = newRoleName.trim()
    if (!trimmedName) {
      return
    }

    // Check for duplicates (case-insensitive)
    const existingRole = roles.find(
      r => r.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existingRole) {
      alert('Role with this name already exists')
      // If role exists but not selected, add it to selection
      if (!selectedRoleIds.includes(existingRole.id)) {
        onChange([...selectedRoleIds, existingRole.id])
      }
      setNewRoleName('')
      setIsCreating(false)
      return
    }

    await createRoleMutation.mutateAsync({
      name: trimmedName,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newRoleName.trim()) {
      e.preventDefault()
      handleCreateRole()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewRoleName('')
    }
  }

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Selected roles as tags */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedRoles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {role.name}
              <button
                type="button"
                onClick={() => handleRemoveRole(role.id)}
                className="hover:text-blue-900 focus:outline-none"
                aria-label={`Remove ${role.name}`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Role list with checkboxes */}
      <div className={`border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto ${error ? 'border-red-500' : 'border-gray-300'}`}>
        {isLoading ? (
          <div className="text-sm text-gray-500">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-gray-500">No roles available</div>
        ) : (
          roles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id)
            return (
              <label
                key={role.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleRole(role.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{role.name}</span>
                {role.description && (
                  <span className="text-xs text-gray-500">{role.description}</span>
                )}
              </label>
            )
          })
        )}

        {/* Add new role input */}
        {isCreating ? (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter role name..."
                className="flex-1 input text-sm"
                disabled={createRoleMutation.isPending}
              />
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateRole}
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                className="px-3 py-1.5 text-sm"
              >
                {createRoleMutation.isPending ? '...' : 'Add'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCreating(false)
                  setNewRoleName('')
                }}
                className="px-3 py-1.5 text-sm"
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Press Enter to create</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 pt-2 border-t border-gray-200"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add new role...</span>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

