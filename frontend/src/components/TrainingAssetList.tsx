import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingAssetsApi, TrainingAsset } from '../services/api/training'
import MediaPreview from './MediaPreview'
import Button from './ui/Button'
import { LinkIcon, DocumentIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

interface TrainingAssetListProps {
  topicId: string
  assetType?: 'video' | 'presentation' | 'all'
}

export default function TrainingAssetList({ topicId, assetType = 'all' }: TrainingAssetListProps) {
  const queryClient = useQueryClient()

  const { data: allAssets = [], isLoading } = useQuery({
    queryKey: ['training-assets', topicId],
    queryFn: () => trainingAssetsApi.getAssets(topicId),
    enabled: !!topicId,
  })

  // Filter assets by type if specified
  const assets = assetType === 'all' 
    ? allAssets 
    : allAssets.filter(asset => asset.assetType === assetType)

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

  const handleDelete = async (assetId: string, asset: TrainingAsset) => {
    const assetTypeLabel = asset.assetType === 'presentation' ? 'presentation' : 'video'
    if (window.confirm(`Are you sure you want to delete this ${assetTypeLabel}?`)) {
      await deleteMutation.mutateAsync({ topicId, assetId })
    }
  }

  const getAssetIcon = (asset: TrainingAsset) => {
    if (asset.externalUrl) {
      return <LinkIcon className="h-5 w-5 text-blue-600" />
    }
    if (asset.assetType === 'presentation') {
      return <DocumentIcon className="h-5 w-5 text-purple-600" />
    }
    return <VideoCameraIcon className="h-5 w-5 text-red-600" />
  }

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Loading assets...</div>
  }

  return (
    <div className="space-y-4">
      {/* Assets List */}
      {assets.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">
            {assetType === 'presentation' ? 'No presentations added yet' : assetType === 'video' ? 'No videos uploaded yet' : 'No assets added yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset) => {
            const mediaUrl = asset.assetUrl || asset.assetPath
            const isLink = !!asset.externalUrl
            const isPresentation = asset.assetType === 'presentation'
            
            return (
              <div key={asset.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 flex items-start gap-3">
                    <div className="mt-0.5">
                      {getAssetIcon(asset)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        {asset.filename || (isPresentation ? 'Presentation' : 'Video file')}
                        {isLink && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Link
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Type: {asset.assetType} • Source: {asset.source}
                        {asset.size && ` • ${(asset.size / 1024 / 1024).toFixed(2)} MB`}
                        {` • ${new Date(asset.createdAt).toLocaleDateString()}`}
                      </div>
                      {isLink && asset.externalUrl && (
                        <a
                          href={asset.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
                        >
                          {asset.externalUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(asset.id, asset)}
                    disabled={deleteMutation.isPending}
                    className="text-sm"
                  >
                    Delete
                  </Button>
                </div>
                {mediaUrl && !isLink && (
                  <div className="mt-3">
                    {isPresentation ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <DocumentIcon className="h-5 w-5 text-purple-600" />
                          <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {asset.filename || 'Download Presentation'}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <MediaPreview
                        url={mediaUrl || ''}
                        filename={asset.filename || undefined}
                        className="w-full h-64"
                      />
                    )}
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

