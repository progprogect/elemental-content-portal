import { PromptSettings, PromptSettingsField } from '../types/prompt-settings'
import PromptFieldWithPresets from './PromptFieldWithPresets'
import Select from './ui/Select'
import Input from './ui/Input'
import { getPresetsForField } from '../config/prompt-presets'

interface PromptSettingsStepProps {
  stepId: string
  title: string
  fields: PromptSettingsField[]
  settings: PromptSettings
  onChange: (field: PromptSettingsField, value: any) => void
  contentType?: string
}

export default function PromptSettingsStep({
  stepId,
  title,
  fields,
  settings,
  onChange,
  contentType,
}: PromptSettingsStepProps) {
  const renderField = (field: PromptSettingsField) => {
    const value = settings[field]
    const presets = getPresetsForField(field, contentType)

    switch (field) {
      case 'goalDescription':
        return (
          <PromptFieldWithPresets
            key={field}
            label="What do you want to achieve? (1-2 sentences)"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Briefly describe in your own words what you want to get as a result. This will appear at the beginning of the prompt."
            type="textarea"
          />
        )

      case 'orientation':
        return (
          <Select
            key={field}
            label="Orientation"
            value={value as string || ''}
            onChange={(e) => onChange(field, e.target.value)}
            options={[
              { value: '', label: 'Select orientation...' },
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
            ]}
          />
        )

      case 'duration':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Duration"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="e.g., 60 seconds"
            presets={presets}
          />
        )

      case 'language':
        return (
          <Select
            key={field}
            label="Language"
            value={value as string || ''}
            onChange={(e) => onChange(field, e.target.value)}
            options={[
              { value: '', label: 'Select language...' },
              { value: 'English', label: 'English' },
              { value: 'Spanish', label: 'Spanish' },
              { value: 'French', label: 'French' },
              { value: 'German', label: 'German' },
              { value: 'Russian', label: 'Russian' },
              { value: 'Chinese', label: 'Chinese' },
              { value: 'Japanese', label: 'Japanese' },
            ]}
          />
        )

      case 'movement':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Movement"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Describe the movement style..."
            presets={presets}
          />
        )

      case 'sceneTransitions':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Scene Transitions"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Describe how scenes should transition..."
            presets={presets}
          />
        )

      case 'background':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Background"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Describe the background style..."
            presets={presets}
          />
        )

      case 'voice':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Voice"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Describe the voice style..."
            presets={presets}
          />
        )

      case 'hasText':
        return (
          <div key={field} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Should there be on-screen text?
            </label>
            <Select
              value={value === true ? 'yes' : value === false ? 'no' : ''}
              onChange={(e) => onChange(field, e.target.value === 'yes')}
              options={[
                { value: '', label: 'Select...' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </div>
        )

      case 'textContent':
        if (settings.hasText !== true) {
          return null
        }
        return (
          <PromptFieldWithPresets
            key={field}
            label="On-screen Text"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Enter the text to display on screen..."
            type="textarea"
          />
        )

      case 'textToRead':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Text to Read"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Enter the text that should be read aloud..."
            type="textarea"
          />
        )

      case 'additionalRequirements':
        return (
          <PromptFieldWithPresets
            key={field}
            label="Additional Requirements"
            value={value as string || ''}
            onChange={(val) => onChange(field, val)}
            placeholder="Any additional requirements or notes..."
            type="textarea"
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {stepId === 'goal' 
            ? 'Describe what you want to achieve. This description will appear at the beginning of the generated prompt.'
            : 'Fill in the fields below. All fields are optional.'}
        </p>
      </div>
      
      <div className="space-y-4">
        {fields.map((field) => renderField(field))}
      </div>
    </div>
  )
}

