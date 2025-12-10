import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingAssetsApi } from '../services/api/training'
import FileUpload from './FileUpload'
import MediaPreview from './MediaPreview'
import Button from './ui/Button'

interface TrainingAssetListProps {
  topicId: string
}

export default function TrainingAssetList({ topicId }: TrainingAssetListProps) {
  const queryClient = useQueryClient()

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['training-assets', topicId],
    queryFn: () => trainingAssetsApi.getAssets(topicId),
    enabled: !!topicId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => trainingAssetsApi.uploadAsset(topicId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assets', topicId] })
      queryClient.invalidateQueries({ queryKey: ['training-topic', topicId] })
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      alert(error.response?.data?.error || 'Failed to upload video')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ topicId, assetId }: { topicId: string; assetId: string }) => 
      trainingAssetsApi.deleteAsset(topicId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assets', topicId] })
      queryClient.invalidateQueries({ queryKey: ['training-topic', topicId] })
    },
    onError: (error: any) => {
      console.error('Delete error:', error)
      alert(error.response?.data?.error || 'Failed to delete video')
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadMutation.mutateAsync(file)
      e.target.value = '' // Reset input
    }
  }

  const handleDelete = async (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      await deleteMutation.mutateAsync({ topicId, assetId })
    }
  }

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Loading assets...</div>
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Video
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploadMutation.isPending}
            className="hidden"
            id="video-upload"
          />
          <label
            htmlFor="video-upload"
            className="cursor-pointer"
          >
            <Button
              variant="secondary"
              as="span"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Choose Video File'}
            </Button>
          </label>
          {uploadMutation.isPending && (
            <span className="text-sm text-gray-500">Uploading...</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: MP4, MOV, AVI, WebM (max 100MB)
        </p>
      </div>

      {/* Assets List */}
      {assets.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No videos uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset) => {
            const mediaUrl = asset.assetUrl || asset.assetPath
            return (
              <div key={asset.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {asset.filename || 'Video file'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Source: {asset.source} • {asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} • {new Date(asset.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(asset.id)}
                    disabled={deleteMutation.isPending}
                    className="text-sm"
                  >
                    Delete
                  </Button>
                </div>
                {mediaUrl && (
                  <div className="mt-3">
                    <MediaPreview
                      url={mediaUrl}
                      filename={asset.filename}
                      className="w-full h-64"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

