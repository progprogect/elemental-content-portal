import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { sceneGenerationApi, SceneGeneration } from '../services/api/scene-generation'
import Button from '../components/ui/Button'
import { PlusIcon } from '@heroicons/react/24/outline'

export default function SceneGeneration() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)

  // TODO: Implement list query when backend supports it
  // For now, we'll just show a placeholder
  const { data: generations, isLoading } = useQuery({
    queryKey: ['scene-generations'],
    queryFn: async () => {
      // Placeholder - will be implemented when backend supports listing
      return []
    },
  })

  const createMutation = useMutation({
    mutationFn: sceneGenerationApi.generate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scene-generations'] })
      navigate(`/scene-generation/${data.id}`)
    },
  })

  const handleCreateNew = () => {
    setIsCreating(true)
    // For MVP, create with a simple prompt
    // Later, this will open a wizard
    createMutation.mutate({
      prompt: 'Generate a video scene',
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scene Generation</h1>
          <p className="text-gray-600 mt-1">Generate videos from text prompts and resources</p>
        </div>
        <Button onClick={handleCreateNew} disabled={isCreating || createMutation.isPending}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Generation
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      ) : generations && generations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generations.map((generation: SceneGeneration) => (
            <div
              key={generation.id}
              onClick={() => navigate(`/scene-generation/${generation.id}`)}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {generation.prompt || 'Untitled Generation'}
                </h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    generation.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : generation.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : generation.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {generation.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Phase: {generation.phase} | Progress: {generation.progress}%
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(generation.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No generations yet</p>
          <Button onClick={handleCreateNew} disabled={isCreating || createMutation.isPending}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Your First Generation
          </Button>
        </div>
      )}
    </div>
  )
}

