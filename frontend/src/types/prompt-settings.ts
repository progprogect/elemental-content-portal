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

