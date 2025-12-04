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
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="What do you want to achieve?"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="Describe your goal in 1-2 sentences..."
              type="textarea"
            />
            <p className="text-xs text-gray-500">
              This description will appear at the beginning of the generated prompt.
            </p>
          </div>
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
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Duration"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="e.g., 60 seconds"
              presets={presets}
            />
            <p className="text-xs text-gray-500">
              Specify the video duration. You can use presets or write your own value, e.g., "60 seconds" or "2 minutes".
            </p>
          </div>
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
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Movement"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="e.g., friendly, calm, energetic"
              presets={presets}
            />
            <p className="text-xs text-gray-500">
              Describe how the person should move or behave. You can write detailed instructions, e.g., "When the person introduces themselves, they should smile and make eye contact with the camera."
            </p>
          </div>
        )

      case 'sceneTransitions':
        return (
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Scene Transitions"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="e.g., smooth, quick cuts, fade"
              presets={presets}
            />
            <p className="text-xs text-gray-500">
              Describe how scenes should transition. You can write detailed instructions, e.g., "When the character starts introducing themselves, switch the camera angle" or "Use smooth transitions between scenes, but add quick cuts during action moments."
            </p>
          </div>
        )

      case 'background':
        return (
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Background"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="e.g., static, dynamic, blurred"
              presets={presets}
            />
            <p className="text-xs text-gray-500">
              Describe the background style and behavior. You can write detailed instructions, e.g., "Keep the background static during dialogue, but add subtle movement when showing product features."
            </p>
          </div>
        )

      case 'voice':
        return (
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Voice"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="e.g., fast, calm, professional"
              presets={presets}
            />
            <p className="text-xs text-gray-500">
              Describe the voice characteristics. You can write detailed instructions, e.g., "Use a fast-paced voice at the beginning to grab attention, then slow down when explaining important details."
            </p>
          </div>
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
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="On-screen Text"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="Enter text to display..."
              type="textarea"
            />
            <p className="text-xs text-gray-500">
              Enter the text that should appear on screen during the video. You can include multiple lines or formatting instructions.
            </p>
          </div>
        )

      case 'textToRead':
        return (
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Text to Read"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="Enter text to be read aloud..."
              type="textarea"
            />
            <p className="text-xs text-gray-500">
              Enter the exact text that should be read aloud by the voice. This can be a script or narration.
            </p>
          </div>
        )

      case 'additionalRequirements':
        return (
          <div key={field} className="space-y-2">
            <PromptFieldWithPresets
              label="Additional Requirements"
              value={value as string || ''}
              onChange={(val) => onChange(field, val)}
              placeholder="Any additional notes..."
              type="textarea"
            />
            <p className="text-xs text-gray-500">
              Add any other specific requirements or instructions for the video generation. Be as detailed as needed.
            </p>
          </div>
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

