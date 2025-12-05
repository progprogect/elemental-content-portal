import { PromptSettings } from '../types/prompt-settings'
import { promptsApi } from './api/prompts'

/**
 * Strategy for content generation based on content type
 */
export interface GenerationStrategy {
  /** Whether this content type requires the prompt settings wizard */
  requiresWizard: boolean
  /** Whether this content type requires the browser extension */
  requiresExtension: boolean
  /** URL to redirect to for generation */
  redirectUrl: string
  /** Handler function for content generation */
  handler: (
    taskId: string,
    publicationId: string,
    prepareHaygenGeneration: (taskId: string, publicationId: string, settings?: PromptSettings) => Promise<boolean>,
    onFallback: () => void,
    settings?: PromptSettings
  ) => Promise<void>
}

/**
 * Configuration of generation strategies for each content type
 */
const GENERATION_STRATEGIES: Record<string, GenerationStrategy> = {
  video: {
    requiresWizard: true,
    requiresExtension: true,
    redirectUrl: 'https://app.heygen.com/video-agent',
    handler: async (taskId, publicationId, prepareHaygenGeneration, onFallback, settings) => {
      try {
        // Generate prompt with settings (to validate and cache on backend)
        // Only call if settings are provided and not empty
        if (settings && Object.keys(settings).length > 0) {
          await promptsApi.generatePromptWithSettings(taskId, publicationId, settings)
        }
        
        // Save task IDs and settings (via extension or sessionStorage)
        // Extension will fetch prompt data from API using POST with settings
        const success = await prepareHaygenGeneration(taskId, publicationId, settings)
        
        if (success) {
          // Direct redirect to Haygen
          // Extension will automatically fetch data from API and fill the form
          window.open('https://app.heygen.com/video-agent', '_blank')
        } else {
          // Fallback: show prompt modal if extension not available
          onFallback()
        }
      } catch (error) {
        console.error('Failed to generate prompt with settings:', error)
        onFallback()
      }
    },
  },
  talking_head: {
    requiresWizard: false,
    requiresExtension: false,
    redirectUrl: 'https://app.heygen.com/templates?ct=explainer%2520video&shortcut=photo-to-video',
    handler: async () => {
      // Simple redirect without wizard or extension
      window.open('https://app.heygen.com/templates?ct=explainer%2520video&shortcut=photo-to-video', '_blank')
    },
  },
}

/**
 * Check if a content type is supported for generation
 */
export function isContentTypeSupported(contentType: string): boolean {
  return contentType in GENERATION_STRATEGIES
}

/**
 * Get generation strategy for a content type
 */
export function getGenerationStrategy(contentType: string): GenerationStrategy | null {
  return GENERATION_STRATEGIES[contentType] || null
}

/**
 * Handle content generation based on content type
 */
export async function handleContentGeneration(
  taskId: string,
  publicationId: string,
  contentType: string,
  prepareHaygenGeneration: (taskId: string, publicationId: string, settings?: PromptSettings) => Promise<boolean>,
  onFallback: () => void,
  settings?: PromptSettings
): Promise<void> {
  const strategy = getGenerationStrategy(contentType)
  
  if (!strategy) {
    console.warn(`No generation strategy found for content type: ${contentType}`)
    return
  }
  
  await strategy.handler(taskId, publicationId, prepareHaygenGeneration, onFallback, settings)
}

