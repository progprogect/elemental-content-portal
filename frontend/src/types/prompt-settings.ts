export interface PromptSettings {
  // Step 0: Goal description (first field)
  goalDescription?: string
  
  // Step 1: Basic settings
  orientation?: 'horizontal' | 'vertical'
  duration?: string
  language?: string
  
  // Step 2: Video settings
  movement?: string
  sceneTransitions?: string
  background?: string
  
  // Step 3: Audio & Text
  voice?: string
  hasText?: boolean
  textContent?: string
  textToRead?: string
  hasAvatar?: boolean
  hasVoiceOver?: boolean
  
  // Step 4: Additional
  additionalRequirements?: string
}

export interface FieldPreset {
  id: string
  label: string
  value: string // Long text that gets inserted when selected
}

export interface WizardStep {
  id: string
  title: string
  fields: Array<keyof PromptSettings>
}

export type PromptSettingsField = keyof PromptSettings

export interface ImageGenerationSettings {
  prompt: string // обязательное
  stylePreset?: string // ID пресета стиля
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  model?: 'standard' | 'pro' // версия API
  customStyle?: string // опционально
  referenceImageUrl?: string // URL загруженного reference image
  refinementPrompt?: string // Промпт для доработки (добавляется к основному)
  useCurrentResultAsReference?: boolean // Флаг для использования текущего результата как reference
}

