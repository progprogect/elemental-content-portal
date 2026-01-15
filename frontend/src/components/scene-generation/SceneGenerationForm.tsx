import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { XMarkIcon, PhotoIcon, VideoCameraIcon, LinkIcon } from '@heroicons/react/24/outline'

interface SceneGenerationFormProps {
  onSubmit: (data: {
    prompt: string
    videos?: Array<{ id: string; path: string }>
    images?: Array<{ id: string; path: string }>
    references?: Array<{ id: string; pathOrUrl: string }>
    aspectRatio?: number
    reviewScenario?: boolean
    reviewScenes?: boolean
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function SceneGenerationForm({ onSubmit, onCancel, isLoading }: SceneGenerationFormProps) {
  const [prompt, setPrompt] = useState('')
  const [videos, setVideos] = useState<Array<{ id: string; path: string; file?: File }>>([])
  const [images, setImages] = useState<Array<{ id: string; path: string; file?: File }>>([])
  const [references, setReferences] = useState<Array<{ id: string; pathOrUrl: string }>>([])
  const [referenceUrl, setReferenceUrl] = useState('')
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9)
  const [reviewScenario, setReviewScenario] = useState(false)
  const [reviewScenes, setReviewScenes] = useState(false)

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const path = URL.createObjectURL(file)
      setVideos((prev) => [...prev, { id, path, file }])
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const id = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const path = URL.createObjectURL(file)
      setImages((prev) => [...prev, { id, path, file }])
    })
  }

  const handleAddReference = () => {
    if (referenceUrl.trim()) {
      const id = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setReferences((prev) => [...prev, { id, pathOrUrl: referenceUrl.trim() }])
      setReferenceUrl('')
    }
  }

  const handleRemoveVideo = (id: string) => {
    setVideos((prev) => {
      const item = prev.find((v) => v.id === id)
      if (item) {
        URL.revokeObjectURL(item.path)
      }
      return prev.filter((v) => v.id !== id)
    })
  }

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        URL.revokeObjectURL(item.path)
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  const handleRemoveReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      return
    }

    // TODO: Upload files to storage and get paths
    // For now, use temporary paths
    onSubmit({
      prompt: prompt.trim(),
      videos: videos.map((v) => ({ id: v.id, path: v.path })),
      images: images.map((i) => ({ id: i.id, path: i.path })),
      references: references.map((r) => ({ id: r.id, pathOrUrl: r.pathOrUrl })),
      aspectRatio,
      reviewScenario,
      reviewScenes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
          Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="input w-full"
          placeholder="Describe the video scene you want to generate..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Videos (optional)</label>
        <div className="space-y-2">
          {videos.map((video) => (
            <div key={video.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <VideoCameraIcon className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-sm text-gray-700 truncate">{video.file?.name || video.path}</span>
              <button
                type="button"
                onClick={() => handleRemoveVideo(video.id)}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <VideoCameraIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">Upload video files</span>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Images (optional)</label>
        <div className="space-y-2">
          {images.map((image) => (
            <div key={image.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <PhotoIcon className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-sm text-gray-700 truncate">{image.file?.name || image.path}</span>
              <button
                type="button"
                onClick={() => handleRemoveImage(image.id)}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
            <PhotoIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">Upload image files</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">References (optional)</label>
        <div className="space-y-2">
          {references.map((ref) => (
            <div key={ref.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <LinkIcon className="h-5 w-5 text-gray-500" />
              <span className="flex-1 text-sm text-gray-700 truncate">{ref.pathOrUrl}</span>
              <button
                type="button"
                onClick={() => handleRemoveReference(ref.id)}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="Enter reference URL or path"
              className="flex-1"
            />
            <Button type="button" onClick={handleAddReference} variant="secondary">
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-700 mb-2">
            Aspect Ratio
          </label>
          <select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(parseFloat(e.target.value))}
            className="input"
          >
            <option value={16 / 9}>16:9 (Landscape)</option>
            <option value={9 / 16}>9:16 (Portrait)</option>
            <option value={1}>1:1 (Square)</option>
            <option value={4 / 3}>4:3 (Classic)</option>
            <option value={21 / 9}>21:9 (Ultrawide)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reviewScenario}
            onChange={(e) => setReviewScenario(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Review scenario before rendering</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reviewScenes}
            onChange={(e) => setReviewScenes(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Review individual scenes</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onCancel} variant="ghost" disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? 'Generating...' : 'Generate Scene'}
        </Button>
      </div>
    </form>
  )
}

