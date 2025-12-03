import { useState } from 'react'
import MDEditor from '@uiw/react-md-editor'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  label?: string
  placeholder?: string
  error?: string
}

export default function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder = 'Enter markdown content...',
  error,
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 border-b border-gray-300 px-3 py-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                !isPreview
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                isPreview
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
        <div data-color-mode="light" className={isPreview ? 'hidden' : ''}>
          <MDEditor
            value={value}
            onChange={onChange}
            preview="edit"
            hideToolbar={false}
            visibleDragbar={false}
            textareaProps={{
              placeholder,
              style: { fontSize: 14 },
            }}
          />
        </div>
        {isPreview && (
          <div className="p-4 min-h-[200px] prose prose-sm max-w-none">
            <MDEditor.Markdown source={value || ''} />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

