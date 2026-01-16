import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sceneGenerationApi } from '../services/api/scene-generation'
import ScenarioEditor, { type Scenario } from '../components/scene-generation/ScenarioEditor'
import Button from '../components/ui/Button'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function ScenarioReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: generation, isLoading } = useQuery({
    queryKey: ['scene-generation', id],
    queryFn: () => sceneGenerationApi.getStatus(id!),
    enabled: !!id,
  })

  const { data: scenarioData } = useQuery({
    queryKey: ['scenario', id],
    queryFn: () => sceneGenerationApi.getScenario(id!),
    enabled: !!id && !!generation?.scenario,
  })

  const updateScenarioMutation = useMutation({
    mutationFn: (scenario: Scenario) => sceneGenerationApi.updateScenario(id!, scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', id] })
      queryClient.invalidateQueries({ queryKey: ['scene-generation', id] })
    },
  })

  const continueMutation = useMutation({
    mutationFn: () => sceneGenerationApi.continue(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-generation', id] })
      navigate(`/scene-generation/${id}`)
    },
  })

  const handleSave = (scenario: Scenario) => {
    updateScenarioMutation.mutate(scenario)
  }

  const handleApprove = () => {
    // Continue generation after review
    continueMutation.mutate()
  }

  if (isLoading || !scenarioData) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-gray-500">Loading scenario...</div>
      </div>
    )
  }

  const scenario = scenarioData.scenario as Scenario

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button onClick={() => navigate(`/scene-generation/${id}`)} variant="ghost" className="mb-4">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Generation
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Review Scenario</h1>
        <p className="text-gray-600 mt-1">
          Review and edit the generated scenario before proceeding with scene rendering
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ScenarioEditor
          scenario={scenario}
          onSave={handleSave}
          onCancel={() => navigate(`/scene-generation/${id}`)}
        />
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button onClick={() => navigate(`/scene-generation/${id}`)} variant="ghost" disabled={continueMutation.isPending}>
          Cancel
        </Button>
        <Button onClick={handleApprove} variant="primary" disabled={continueMutation.isPending}>
          <CheckIcon className="h-5 w-5 mr-2" />
          {continueMutation.isPending ? 'Continuing...' : 'Approve and Continue'}
        </Button>
      </div>
    </div>
  )
}

