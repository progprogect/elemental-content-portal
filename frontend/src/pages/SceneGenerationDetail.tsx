import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sceneGenerationApi } from '../services/api/scene-generation'
import { useSceneGenerationSocket } from '../hooks/useSceneGenerationSocket'
import ScenePreview from '../components/scene-generation/ScenePreview'
import Button from '../components/ui/Button'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function SceneGenerationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const { data: generation, isLoading, error } = useQuery({
    queryKey: ['scene-generation', id],
    queryFn: () => sceneGenerationApi.getStatus(id!),
    enabled: !!id,
    refetchInterval: (data) => {
      // Refetch every 5 seconds if still processing (WebSocket will handle real-time updates)
      if (data?.status === 'processing' || data?.status === 'queued') {
        return 5000
      }
      return false
    },
  })

  // WebSocket for real-time updates
  useSceneGenerationSocket(id, {
    progress: (data) => {
      if (data.generationId === id) {
        queryClient.setQueryData(['scene-generation', id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            progress: data.progress,
            phase: data.phase,
          }
        })
      }
    },
    'phase-change': (data) => {
      if (data.generationId === id) {
        queryClient.setQueryData(['scene-generation', id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            phase: data.phase,
            progress: data.progress,
          }
        })
      }
    },
    'scene-complete': (data) => {
      if (data.generationId === id) {
        // Invalidate to refetch scenes
        queryClient.invalidateQueries({ queryKey: ['scene-generation', id] })
      }
    },
    'generation-complete': (data) => {
      if (data.generationId === id) {
        queryClient.setQueryData(['scene-generation', id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            status: 'completed',
            progress: 100,
            phase: 'phase4',
            resultUrl: data.resultUrl,
          }
        })
      }
    },
    error: (data) => {
      if (data.generationId === id) {
        queryClient.setQueryData(['scene-generation', id], (old: any) => {
          if (!old) return old
          return {
            ...old,
            status: 'failed',
            error: data.error,
          }
        })
      }
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => sceneGenerationApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-generation', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !generation) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error loading generation</div>
        <Button onClick={() => navigate('/scene-generation')} className="mt-4">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to List
        </Button>
      </div>
    )
  }

  const phases = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4']
  const phaseLabels = {
    phase0: 'Resource Understanding',
    phase1: 'Scenario Generation',
    phase2: 'Scene Project Construction',
    phase3: 'Scene Pipelines',
    phase4: 'Final Composition',
  }

  const currentPhaseIndex = phases.indexOf(generation.phase)

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button onClick={() => navigate('/scene-generation')} variant="ghost" className="mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Scene Generation</h1>
        <p className="text-gray-600 mt-1">{generation.prompt || 'Untitled Generation'}</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Status</h2>
            <span
              className={`inline-block px-3 py-1 text-sm rounded mt-2 ${
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
          {generation.status === 'processing' || generation.status === 'queued' ? (
            <Button
              onClick={() => cancelMutation.mutate()}
              variant="danger"
              disabled={cancelMutation.isPending}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{generation.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generation.progress}%` }}
            />
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-3">
          {phases.map((phase, index) => {
            const isCompleted = index < currentPhaseIndex
            const isCurrent = index === currentPhaseIndex
            const isPending = index > currentPhaseIndex

            return (
              <div key={phase} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {phaseLabels[phase as keyof typeof phaseLabels]}
                  </div>
                  {isCurrent && generation.status === 'processing' && (
                    <div className="text-xs text-gray-500">In progress...</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scenes */}
      {generation.scenes && generation.scenes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scenes</h2>
          <div className="space-y-3">
            {generation.scenes.map((scene) => (
              <div key={scene.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">Scene {scene.orderIndex + 1}</h3>
                    <p className="text-sm text-gray-600">Type: {scene.kind}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      scene.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : scene.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {scene.status}
                  </span>
                </div>
                {scene.renderedAssetUrl && (
                  <div className="mt-2">
                    <img
                      src={scene.renderedAssetUrl}
                      alt={`Scene ${scene.orderIndex + 1}`}
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {generation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700 text-sm">{generation.error}</p>
        </div>
      )}

      {/* Result */}
      {generation.resultUrl && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Result</h2>
          <video src={generation.resultUrl} controls className="w-full rounded">
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  )
}

