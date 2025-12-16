import { useState } from 'react'
import { FieldPreset } from '../types/prompt-settings'
import Button from './ui/Button'
import VoiceInputButton from './VoiceInputButton'

interface PromptFieldWithPresetsProps {
  label: string
  value: string
  onChange: (value: string) => void
  presets?: FieldPreset[]
  placeholder?: string
  type?: 'text' | 'textarea'
  required?: boolean
}

export default function PromptFieldWithPresets({
  label,
  value,
  onChange,
  presets = [],
  placeholder,
  type = 'text',
  required = false,
}: PromptFieldWithPresetsProps) {
  const [isPresetsExpanded, setIsPresetsExpanded] = useState(false)

  const handlePresetClick = (preset: FieldPreset) => {
    // Insert preset value into field
    onChange(preset.value)
    setIsPresetsExpanded(false)
  }

  const InputComponent = type === 'textarea' ? 'textarea' : 'input'

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <InputComponent
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input w-full ${type === 'textarea' ? 'min-h-[100px] resize-y pr-10' : 'pr-10'}`}
          required={required}
        />
        <VoiceInputButton
          onTranscribe={(text) => {
            // Add transcribed text to existing value with space separator
            onChange(value + (value ? ' ' : '') + text)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        />
      </div>

      {presets.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {isPresetsExpanded ? 'Hide' : 'Show'} presets ({presets.length})
          </button>
          
          {isPresetsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="secondary"
                  className="text-left text-sm py-2 px-3 h-auto whitespace-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  <div className="font-medium">{preset.label}</div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

