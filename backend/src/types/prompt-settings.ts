import { z } from 'zod'

export interface PromptSettings {
  goalDescription?: string
  orientation?: 'horizontal' | 'vertical'
  duration?: string
  language?: string
  movement?: string
  sceneTransitions?: string
  background?: string
  voice?: string
  hasText?: boolean
  textContent?: string
  textToRead?: string
  additionalRequirements?: string
}

export const promptSettingsSchema = z.object({
  goalDescription: z.string().optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  duration: z.string().optional(),
  language: z.string().optional(),
  movement: z.string().optional(),
  sceneTransitions: z.string().optional(),
  background: z.string().optional(),
  voice: z.string().optional(),
  hasText: z.boolean().optional(),
  textContent: z.string().optional(),
  textToRead: z.string().optional(),
  additionalRequirements: z.string().optional(),
})

export interface ImageGenerationSettings {
  prompt: string
  stylePreset?: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  model?: 'standard' | 'pro'
  customStyle?: string
}

export interface ImageGenerationResult {
  assetUrl: string
  assetPath: string
}

