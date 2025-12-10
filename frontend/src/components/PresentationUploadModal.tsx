import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingAssetsApi, AddAssetLinkData } from '../services/api/training'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { CloudArrowUpIcon, LinkIcon } from '@heroicons/react/24/outline'

interface PresentationUploadModalProps {
  isOpen: boolean
  onClose: () => void
  topicId: string
}

export default function PresentationUploadModal({ isOpen, onClose, topicId }: PresentationUploadModalProps) {
  const queryClient = useQueryClient()
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkFilename, setLinkFilename] = useState('')

  const uploadMutation = useMutation({
    mutationFn: (file: File) => trainingAssetsApi.uploadPresentation(topicId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assets', topicId] })
      queryClient.invalidateQueries({ queryKey: ['training-topic', topicId] })
      handleClose()
    },
    onError: (error: any) => {
      console.error('Upload error:', error)
      alert(error.response?.data?.error || 'Failed to upload presentation')
    },
  })

  const addLinkMutation = useMutation({
    mutationFn: (data: AddAssetLinkData) => trainingAssetsApi.addAssetLink(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assets', topicId] })
      queryClient.invalidateQueries({ queryKey: ['training-topic', topicId] })
      handleClose()
    },
    onError: (error: any) => {
      console.error('Add link error:', error)
      alert(error.response?.data?.error || 'Failed to add presentation link')
    },
  })

  const handleClose = () => {
    setFile(null)
    setLinkUrl('')
    setLinkFilename('')
    setUploadMode('file')
    onClose()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUploadFile = () => {
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      addLinkMutation.mutate({
        url: linkUrl.trim(),
        filename: linkFilename.trim() || undefined,
        assetType: 'presentation',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Presentation"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          {uploadMode === 'file' ? (
            <Button
              variant="primary"
              onClick={handleUploadFile}
              disabled={!file || uploadMutation.isPending}
              className="ml-3"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Presentation'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleAddLink}
              disabled={!linkUrl.trim() || addLinkMutation.isPending}
              className="ml-3"
            >
              {addLinkMutation.isPending ? 'Adding...' : 'Add Link'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2 border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === 'file'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CloudArrowUpIcon className="h-5 w-5 mx-auto mb-1" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('link')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === 'link'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LinkIcon className="h-5 w-5 mx-auto mb-1" />
            Add Link
          </button>
        </div>

        {/* File upload mode */}
        {uploadMode === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Presentation File (PDF, PPT, PPTX, PPSX)
            </label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.ppsx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.presentationml.slideshow"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {/* Link mode */}
        {uploadMode === 'link' && (
          <div className="space-y-4">
            <Input
              label="Presentation URL"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              required
            />
            <Input
              label="Display Name (optional)"
              type="text"
              value={linkFilename}
              onChange={(e) => setLinkFilename(e.target.value)}
              placeholder="e.g., Training Presentation"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

