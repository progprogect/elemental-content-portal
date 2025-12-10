import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { trainingTopicsApi, TrainingTopic } from '../services/api/training'
import Button from '../components/ui/Button'
import TrainingTopicForm from '../components/TrainingTopicForm'
import TrainingRoleTags from '../components/TrainingRoleTags'

export default function LearningMaterials() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data: topics = [], isLoading, error } = useQuery({
    queryKey: ['training-topics'],
    queryFn: trainingTopicsApi.getTopics,
  })

  const deleteMutation = useMutation({
    mutationFn: trainingTopicsApi.deleteTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-topics'] })
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      alert(error.response?.data?.error || 'Failed to delete topic')
    },
  })

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

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
    return <div className="text-center py-8 text-red-600">Error loading topics</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Learning Materials</h2>
          <p className="text-gray-500 mt-1">Manage training topics and educational content</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + Create Topic
        </Button>
      </div>

      {topics.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No training topics yet</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Your First Topic
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onView={() => navigate(`/learning-materials/${topic.id}`)}
              onDelete={() => handleDelete(topic.id)}
            />
          ))}
        </div>
      )}

      <TrainingTopicForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['training-topics'] })
        }}
      />
    </div>
  )
}

function TopicCard({ topic, onView, onDelete }: { topic: TrainingTopic; onView: () => void; onDelete: () => void }) {
  const hasScript = topic.presentationScript && topic.presentationScript.trim().length > 0
  const hasTest = !!topic.test
  const hasAssets = topic.assets && topic.assets.length > 0

  return (
    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">{topic.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-red-600 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>

      {topic.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{topic.description}</p>
      )}

      {/* Roles */}
      {topic.roles && topic.roles.length > 0 && (
        <div className="mb-3">
          <TrainingRoleTags roles={topic.roles} maxVisible={3} />
        </div>
      )}

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
        {hasScript && (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Script</span>
        )}
        {hasTest && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Test</span>
        )}
        {hasAssets && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
            {topic.assets.length} Video{topic.assets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-400">
        Created {new Date(topic.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}

