import { useState, useRef } from 'react'
import { importExportApi, ImportResult } from '../services/api/tasks'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { getErrorMessage } from '../utils/error-handler'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  listId?: string
  onImportComplete?: () => void
}

export default function ImportExportModal({
  isOpen,
  onClose,
  listId,
  onImportComplete,
}: ImportExportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.')
      return
    }

    setIsImporting(true)
    setError(null)
    setImportResult(null)

    try {
      // Pass 'null' as string for "All Tasks" case, or actual listId
      const importListId = listId || 'null'
      const result = await importExportApi.importTasks(importListId, file)
      setImportResult(result)
      if (result.success > 0 && onImportComplete) {
        // Delay to show result before closing
        setTimeout(() => {
          onImportComplete()
        }, 2000)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsImporting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    setError(null)
    try {
      await importExportApi.downloadTemplate()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleClose = () => {
    setImportResult(null)
    setError(null)
    setIsDragging(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Content Plan"
      footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full">
          <Button
            variant="secondary"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate || isImporting}
            className="w-full sm:w-auto"
          >
            {isDownloadingTemplate ? 'Downloading...' : 'Download Template'}
          </Button>
          <Button
            variant="primary"
            onClick={handleClose}
            disabled={isImporting}
            className="w-full sm:w-auto"
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!importResult ? (
          <>
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel file (.xlsx, .xls) or CSV file to import tasks. Make sure your file follows the template format.
              </p>
              
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                } ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                      disabled={isImporting}
                    >
                      Click to upload
                    </button>
                    {' or drag and drop'}
                  </div>
                  <p className="text-xs text-gray-500">
                    Excel files (.xlsx, .xls) or CSV files up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {isImporting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-800">Importing tasks... Please wait.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className={`border rounded-lg p-4 ${
              importResult.failed === 0
                ? 'bg-green-50 border-green-200'
                : importResult.success > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className="font-semibold mb-2">
                {importResult.failed === 0
                  ? 'Import Completed Successfully'
                  : importResult.success > 0
                  ? 'Import Completed with Errors'
                  : 'Import Failed'}
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium text-green-700">Successfully imported:</span>{' '}
                  <span className="text-green-800">{importResult.success} task(s)</span>
                </p>
                {importResult.failed > 0 && (
                  <p>
                    <span className="font-medium text-red-700">Failed:</span>{' '}
                    <span className="text-red-800">{importResult.failed} row(s)</span>
                  </p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h5 className="font-semibold text-sm mb-2">Errors:</h5>
                <div className="space-y-1 text-xs">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-red-700">
                      <span className="font-medium">Row {error.row}:</span> {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

