import { FieldPreset } from '../types/prompt-settings'

export interface FieldPresets {
  [fieldName: string]: FieldPreset[]
}

// Presets configuration
// Structure allows future extension for different content types
export interface PresetsConfig {
  // For future: different presets for different content types
  byContentType?: {
    video?: FieldPresets
    image?: FieldPresets
    talking_head?: FieldPresets
  }
  // Current: common presets for all content types
  default: FieldPresets
}

// Duration presets
const durationPresets: FieldPreset[] = [
  { id: '15s', label: '15 seconds', value: '15 seconds' },
  { id: '30s', label: '30 seconds', value: '30 seconds' },
  { id: '60s', label: '60 seconds', value: '60 seconds' },
  { id: '90s', label: '90 seconds', value: '90 seconds' },
  { id: '2m', label: '2 minutes', value: '2 minutes' },
]

// Voice presets
const voicePresets: FieldPreset[] = [
  {
    id: 'fast-energetic',
    label: 'Fast & Energetic',
    value: 'Use a fast-paced, energetic voice that conveys excitement and urgency',
  },
  {
    id: 'slow-calm',
    label: 'Slow & Calm',
    value: 'Use a slow, calm voice with a soothing tone',
  },
  {
    id: 'professional',
    label: 'Professional',
    value: 'Use a professional, clear voice with proper articulation',
  },
  {
    id: 'friendly-warm',
    label: 'Friendly & Warm',
    value: 'Use a friendly, warm voice that feels approachable',
  },
]

// Movement presets
const movementPresets: FieldPreset[] = [
  {
    id: 'friendly',
    label: 'Friendly',
    value: 'The person shown in the materials communicates pleasantly and friendly, smiles',
  },
  {
    id: 'calm',
    label: 'Calm',
    value: 'The person behaves calmly and measuredly',
  },
  {
    id: 'confident',
    label: 'Confident',
    value: 'The person demonstrates confidence and professionalism',
  },
  {
    id: 'energetic',
    label: 'Energetic',
    value: 'The person moves energetically and dynamically',
  },
]

// Scene transitions presets
const sceneTransitionsPresets: FieldPreset[] = [
  {
    id: 'smooth',
    label: 'Smooth transitions',
    value: 'Use smooth, gradual transitions between scenes',
  },
  {
    id: 'quick-cuts',
    label: 'Quick cuts',
    value: 'Use quick cuts between scenes for dynamic pacing',
  },
  {
    id: 'fade',
    label: 'Fade transitions',
    value: 'Use fade transitions for a softer feel',
  },
  {
    id: 'no-transitions',
    label: 'No transitions',
    value: 'Keep scenes static without transitions',
  },
]

// Background presets
const backgroundPresets: FieldPreset[] = [
  {
    id: 'static',
    label: 'Static',
    value: 'Keep the background static without changes',
  },
  {
    id: 'subtle',
    label: 'Subtle changes',
    value: 'Make subtle background changes to maintain interest',
  },
  {
    id: 'dynamic',
    label: 'Dynamic',
    value: 'Use dynamic background changes throughout the video',
  },
  {
    id: 'blurred',
    label: 'Blurred',
    value: 'Use a blurred background to focus on the subject',
  },
]

// Image style presets
const imageStylePresets: FieldPreset[] = [
  {
    id: 'photo-realistic',
    label: 'Photo-realistic',
    value: 'photorealistic, high quality, detailed, professional photography, realistic lighting, sharp focus',
  },
  {
    id: 'artistic',
    label: 'Artistic',
    value: 'artistic style, creative, expressive, vibrant colors, artistic composition',
  },
  {
    id: 'digital-art',
    label: 'Digital Art',
    value: 'digital art, modern, sleek, contemporary design, digital illustration',
  },
  {
    id: 'illustration',
    label: 'Illustration',
    value: 'illustration style, hand-drawn, artistic illustration, detailed illustration',
  },
  {
    id: 'sketch',
    label: 'Sketch',
    value: 'sketch style, pencil drawing, artistic sketch, hand-drawn sketch',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    value: 'vintage style, retro, classic, nostalgic, vintage photography',
  },
  {
    id: 'modern',
    label: 'Modern',
    value: 'modern style, contemporary, clean, minimalist design, modern aesthetic',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    value: 'minimalist style, simple, clean, minimal design, minimalist composition',
  },
]

// Default presets configuration
export const defaultPresets: FieldPresets = {
  duration: durationPresets,
  voice: voicePresets,
  movement: movementPresets,
  sceneTransitions: sceneTransitionsPresets,
  background: backgroundPresets,
  stylePreset: imageStylePresets,
}

// Full presets configuration (ready for future extension)
export const presetsConfig: PresetsConfig = {
  default: defaultPresets,
  byContentType: {
    image: {
      stylePreset: imageStylePresets,
    },
  },
}

// Helper function to get presets for a field
export function getPresetsForField(fieldName: string, contentType?: string): FieldPreset[] {
  if (contentType && presetsConfig.byContentType?.[contentType as keyof typeof presetsConfig.byContentType]?.[fieldName]) {
    return presetsConfig.byContentType[contentType as keyof typeof presetsConfig.byContentType]![fieldName]
  }
  return defaultPresets[fieldName] || []
}

