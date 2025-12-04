import { Platform } from '../services/api/tasks'

interface PlatformSelectorProps {
  platforms: Platform[]
  selectedPlatforms: string[]
  onChange: (selected: string[]) => void
  label?: string
  error?: string
}

export default function PlatformSelector({
  platforms,
  selectedPlatforms,
  onChange,
  label,
  error,
}: PlatformSelectorProps) {
  const handleToggle = (platformCode: string) => {
    if (selectedPlatforms.includes(platformCode)) {
      onChange(selectedPlatforms.filter(code => code !== platformCode))
    } else {
      onChange([...selectedPlatforms, platformCode])
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.code)
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleToggle(platform.code)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-150
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl">{platform.icon || '📱'}</div>
                <div className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                  {platform.name}
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {selectedPlatforms.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Выбрано платформ: {selectedPlatforms.length}
        </p>
      )}
    </div>
  )
}


