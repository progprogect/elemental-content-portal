import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingTopicsApi, TrainingTopic } from '../services/api/training'
import Button from '../components/ui/Button'
import TrainingRoleTags from '../components/TrainingRoleTags'
import HeyGenPromptModal from '../components/HeyGenPromptModal'
import GensparkPromptModal from '../components/GensparkPromptModal'
import PresentationUploadModal from '../components/PresentationUploadModal'
import TrainingTestEditor from '../components/TrainingTestEditor'
import TrainingAssetList from '../components/TrainingAssetList'
import MarkdownEditor from '../components/MarkdownEditor'

export default function TrainingTopicDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isHeyGenModalOpen, setIsHeyGenModalOpen] = useState(false)
  const [isGensparkModalOpen, setIsGensparkModalOpen] = useState(false)
  const [isPresentationUploadModalOpen, setIsPresentationUploadModalOpen] = useState(false)
  const [presentationScript, setPresentationScript] = useState('')

  const { data: topic, isLoading } = useQuery<TrainingTopic>({
    queryKey: ['training-topic', id],
    queryFn: () => trainingTopicsApi.getTopic(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (topic) {
      setPresentationScript(topic.presentationScript || '')
    }
  }, [topic])

  const updateScriptMutation = useMutation({
    mutationFn: (script: string) => trainingTopicsApi.updateTopic(id!, { presentationScript: script }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-topic', id] })
    },
    onError: (error: any) => {
      console.error('Script update error:', error)
      alert(error.response?.data?.error || 'Failed to save script')
    },
  })

  const handleSaveScript = async () => {
    await updateScriptMutation.mutateAsync(presentationScript)
  }

  if (isLoading || !topic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 skeleton w-64"></div>
        <div className="card">
          <div className="h-6 skeleton w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{topic.title}</h2>
          {topic.description && (
            <p className="text-gray-600 mt-2">{topic.description}</p>
          )}
          {topic.roles && topic.roles.length > 0 && (
            <div className="mt-3">
              <TrainingRoleTags roles={topic.roles} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/learning-materials')}>
            Back
          </Button>
        </div>
      </div>

      {/* Presentation Script Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Presentation Script</h3>
          <Button
            variant="primary"
            onClick={handleSaveScript}
            disabled={updateScriptMutation.isPending}
          >
            {updateScriptMutation.isPending ? 'Saving...' : 'Save Script'}
          </Button>
        </div>
        <MarkdownEditor
          value={presentationScript}
          onChange={setPresentationScript}
          placeholder="Enter your presentation script here..."
          className="min-h-[300px]"
        />
      </div>

      {/* Actions Section */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => setIsHeyGenModalOpen(true)}
            disabled={!topic.presentationScript || topic.presentationScript.trim().length === 0}
          >
            🎬 Generate Video in HeyGen
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsGensparkModalOpen(true)}
            disabled={!topic.presentationScript || topic.presentationScript.trim().length === 0}
          >
            📊 Generate Presentation in Genspark
          </Button>
        </div>
      </div>

      {/* Video Assets Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Video Assets</h3>
        </div>
        <TrainingAssetList topicId={topic.id} assetType="video" />
      </div>

      {/* Presentation Assets Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Presentation Assets</h3>
          <Button
            variant="secondary"
            onClick={() => setIsPresentationUploadModalOpen(true)}
          >
            Add Presentation
          </Button>
        </div>
        <TrainingAssetList topicId={topic.id} assetType="presentation" />
      </div>

      {/* Test Section */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Generated Test</h3>
        <TrainingTestEditor topicId={topic.id} />
      </div>

      {/* HeyGen Prompt Modal */}
      <HeyGenPromptModal
        isOpen={isHeyGenModalOpen}
        onClose={() => setIsHeyGenModalOpen(false)}
        topicId={topic.id}
      />

      {/* Genspark Prompt Modal */}
      <GensparkPromptModal
        isOpen={isGensparkModalOpen}
        onClose={() => setIsGensparkModalOpen(false)}
        topicId={topic.id}
      />

      {/* Presentation Upload Modal */}
      <PresentationUploadModal
        isOpen={isPresentationUploadModalOpen}
        onClose={() => setIsPresentationUploadModalOpen(false)}
        topicId={topic.id}
      />
    </div>
  )
}

