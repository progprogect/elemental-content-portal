import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingTestsApi, TrainingTest } from '../services/api/training'
import Button from './ui/Button'
import VoiceInputButton from './VoiceInputButton'

interface TrainingTestEditorProps {
  topicId: string
}

export default function TrainingTestEditor({ topicId }: TrainingTestEditorProps) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: test, isLoading, error } = useQuery<TrainingTest>({
    queryKey: ['training-test', topicId],
    queryFn: () => trainingTestsApi.getTest(topicId),
    enabled: !!topicId,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (test not found is a valid state)
      if (error?.response?.status === 404) {
        return false
      }
      return failureCount < 3
    },
  })

  useEffect(() => {
    if (test) {
      setContent(test.generatedTestContent || '')
      setIsEditing(false)
    }
  }, [test])

  const generateMutation = useMutation({
    mutationFn: () => trainingTestsApi.generateTest(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-test', topicId] })
      // State will be updated via useQuery onSuccess after refetch
    },
    onError: (error: any) => {
      console.error('Test generation error:', error)
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to generate test')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ testId, content }: { testId: string; content: string }) => 
      trainingTestsApi.updateTest(topicId, testId, { generatedTestContent: content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-test', topicId] })
      setIsEditing(true)
    },
    onError: (error: any) => {
      console.error('Test update error:', error)
      alert(error.response?.data?.error || 'Failed to update test')
    },
  })

  const handleSave = async () => {
    if (test && content && content.trim()) {
      await updateMutation.mutateAsync({ testId: test.id, content })
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500">
        {test ? 'Loading test...' : 'No test generated yet'}
      </div>
    )
  }

  // Handle 404 as normal state (test not generated yet)
  const isNotFound = error && (error as any)?.response?.status === 404
  
  if (isNotFound && !test) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          No test has been generated yet. Click "Generate Test" to create one.
        </p>
        <Button
          variant="primary"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate Test'}
        </Button>
      </div>
    )
  }
  
  // Handle other errors
  if (error && !isNotFound) {
    return (
      <div className="text-center py-4 text-red-600">
        Failed to load test: {(error as any)?.response?.data?.error || 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {test && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                isEditing ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isEditing ? 'Edited' : 'Generated'}
              </span>
              <span className="text-xs text-gray-500">
                Generated {new Date(test.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="text-sm"
              >
                {generateMutation.isPending ? 'Regenerating...' : 'Regenerate Test'}
              </Button>
              {content !== (test.generatedTestContent || '') && (
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !content || !content.trim()}
                  className="text-sm"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={content || ''}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg font-mono text-sm min-h-[300px]"
              placeholder="Test content will appear here..."
            />
            <VoiceInputButton
              onTranscribe={(text) => {
                setContent((content || '') + (content ? ' ' : '') + text)
              }}
              className="absolute right-2 top-2"
            />
          </div>
        </>
      )}

      {!test && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No test generated yet</p>
          <Button
            variant="primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate Test'}
          </Button>
        </div>
      )}
    </div>
  )
}

