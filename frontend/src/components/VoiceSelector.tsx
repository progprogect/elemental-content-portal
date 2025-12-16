import { useQuery } from '@tanstack/react-query'
import Select from './ui/Select'
import { voicesApi, Voice } from '../services/api/voices'

interface VoiceSelectorProps {
  value: string
  onChange: (voiceId: string) => void
  disabled?: boolean
}

export default function VoiceSelector({ value, onChange, disabled }: VoiceSelectorProps) {
  const { data: voices, isLoading } = useQuery({
    queryKey: ['voices'],
    queryFn: voicesApi.getVoices,
  })

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="input animate-pulse bg-gray-200 h-10 rounded-lg"></div>
      </div>
    )
  }

  // Group voices by type
  const premiumVoices = voices?.filter(v => v.voiceType === 'premium') || []
  const clonedVoices = voices?.filter(v => v.voiceType === 'cloned') || []

  const options: Array<{ value: string; label: string }> = []

  if (premiumVoices.length > 0) {
    options.push({ value: '', label: '--- Premium Voices ---' })
    premiumVoices.forEach(voice => {
      options.push({ value: voice.id, label: voice.name })
    })
  }

  if (clonedVoices.length > 0) {
    if (premiumVoices.length > 0) {
      options.push({ value: '', label: '--- Cloned Voices ---' })
    }
    clonedVoices.forEach(voice => {
      options.push({ value: voice.id, label: voice.name })
    })
  }

  return (
    <Select
      label="Voice"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      disabled={disabled || isLoading}
      required
    />
  )
}

