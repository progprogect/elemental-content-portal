import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi } from '../services/api/gallery'
import Modal from './ui/Modal'
import Button from './ui/Button'
import FileUpload from './FileUpload'

interface AddGalleryItemModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddGalleryItemModal({ isOpen, onClose }: AddGalleryItemModalProps) {
  const queryClient = useQueryClient()
  const [uploadedFile, setUploadedFile] = useState<{
    filename: string
    path: string
    url: string
    size: number
  } | null>(null)

  const addItemMutation = useMutation({
    mutationFn: async (data: { url: string; path: string }) => {
      return galleryApi.addGalleryItem(data.url, data.path, 'manual')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      handleClose()
    },
    onError: (error: any) => {
      console.error('Add gallery item error:', error)
      alert(error.response?.data?.error || 'Не удалось добавить элемент в галерею')
    },
  })

  const handleClose = () => {
    setUploadedFile(null)
    onClose()
  }

  const handleUploadComplete = (file: { filename: string; path: string; url: string; size: number }) => {
    setUploadedFile(file)
  }

  const handleAddToGallery = () => {
    if (uploadedFile) {
      addItemMutation.mutate({
        url: uploadedFile.url,
        path: uploadedFile.path,
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Добавить медиа в галерею"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleAddToGallery}
            disabled={!uploadedFile || addItemMutation.isPending}
            className="ml-3"
          >
            {addItemMutation.isPending ? 'Добавление...' : 'Добавить в галерею'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FileUpload
          onUploadComplete={handleUploadComplete}
          accept="image/*,video/*"
          maxSize={100 * 1024 * 1024}
        />
        {uploadedFile && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Файл загружен:</span> {uploadedFile.filename} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <p className="text-xs text-green-600 mt-1">
              Нажмите "Добавить в галерею" для сохранения
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

