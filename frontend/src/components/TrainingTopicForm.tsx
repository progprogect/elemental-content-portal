import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingTopicsApi, TrainingTopic } from '../services/api/training'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'
import RoleMultiSelect from './RoleMultiSelect'

interface TrainingTopicFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  topic?: TrainingTopic | null
}

export default function TrainingTopicForm({ isOpen, onClose, onSuccess, topic }: TrainingTopicFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (topic) {
      setTitle(topic.title)
      setDescription(topic.description || '')
      setSelectedRoleIds(topic.roles?.map(r => r.id) || [])
    } else {
      setTitle('')
      setDescription('')
      setSelectedRoleIds([])
    }
    setError('')
  }, [topic, isOpen])

  const createMutation = useMutation({
    mutationFn: trainingTopicsApi.createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-topics'] })
      onSuccess()
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to create topic')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => trainingTopicsApi.updateTopic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-topics'] })
      queryClient.invalidateQueries({ queryKey: ['training-topic', topic?.id] })
      onSuccess()
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to update topic')
    },
  })

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError('')

    if (topic) {
      await updateMutation.mutateAsync({
        id: topic.id,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          roleIds: selectedRoleIds,
        },
      })
    } else {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        roleIds: selectedRoleIds,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topic ? 'Edit Topic' : 'Create Topic'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="ml-3"
          >
            {isPending ? 'Saving...' : topic ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter topic title"
          error={error && !title.trim() ? error : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim() && !isPending) {
              handleSubmit()
            }
          }}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter topic description"
            className="input min-h-[80px]"
            rows={3}
          />
        </div>

        <RoleMultiSelect
          label="Target Roles / Competencies"
          selectedRoleIds={selectedRoleIds}
          onChange={setSelectedRoleIds}
        />

        {error && title.trim() && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </Modal>
  )
}



