import { prisma } from '../utils/prisma';
import { PromptSettings } from '../types/prompt-settings';
import { Task, TaskField, ContentTypeConfig, Platform } from '@prisma/client';

export interface PromptData {
  prompt: string;
  assets: Array<{ type: string; url: string; filename: string }>;
}

interface BuildPromptOptions {
  task: Task & { fields: TaskField[] };
  config: ContentTypeConfig;
  platform?: Platform | null;
  publicationContent?: string | null;
  publicationNote?: string | null;
  settings?: PromptSettings;
}

/**
 * Cleans up the prompt by removing unused placeholders, empty lines, and template boilerplate
 */
function cleanPrompt(prompt: string): string {
  // Remove all unused placeholders (e.g., {description}, {style}, etc.)
  prompt = prompt.replace(/\{[^}]+\}/g, '');
  
  // Remove lines that contain only placeholders or are empty after placeholder removal
  const lines = prompt.split('\n');
  const cleanedLines = lines
    .map(line => line.trim())
    .filter(line => {
      // Remove empty lines
      if (!line) return false;
      // Remove lines that are just colons or dashes (leftovers from template structure)
      if (/^[:\-]+$/.test(line)) return false;
      // Remove lines that are just field names with colons but no value
      // This includes file names like "Avatar IV Video.mp4: " or "IMG_3696.MOV: "
      if (/^[^:]+:\s*$/.test(line)) return false;
      return true;
    });
  
  // Remove common template boilerplate
  // Note: We check if "Additional context:" is followed by content before removing it
  const boilerplatePatterns = [
    /^Create a marketing video with the following requirements:\s*$/i,
    /^Description:\s*$/i,
    /^Style:\s*$/i,
    /^Duration:\s*$/i,
    /^Target Audience:\s*$/i,
    /^Publication-specific content:\s*$/i,
    /^Ответственный:\s*Максим\s*$/i,
    /^Responsible:\s*Максим\s*$/i,
    /^Ответственный:\s*Maxim\s*$/i,
  ];
  
  // Remove boilerplate, but preserve "Additional context:" if it has content after it
  const finalLines: string[] = [];
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    const isAdditionalContext = /^Additional context:\s*$/i.test(line);
    
    if (isAdditionalContext) {
      // Check if there's content after "Additional context:"
      const hasContentAfter = i + 1 < cleanedLines.length && cleanedLines[i + 1].trim().length > 0;
      if (hasContentAfter) {
        // Keep the header if there's content
        finalLines.push(line);
      }
      // Otherwise skip it (it's empty boilerplate)
    } else if (!boilerplatePatterns.some(pattern => pattern.test(line))) {
      finalLines.push(line);
    }
  }
  
  // Join lines and clean up multiple consecutive newlines
  return finalLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Replaces placeholders in template with field values
 */
function replacePlaceholdersInTemplate(
  prompt: string,
  fields: TaskField[],
  platform?: Platform | null
): string {
  // Replace platform placeholders if platform is available
  if (platform) {
    prompt = prompt.replace(/\{platform\}/gi, platform.name);
    prompt = prompt.replace(/\{platform_code\}/gi, platform.code);
  }

  // Replace field placeholders
  fields.forEach((field) => {
    const escapedFieldName = field.fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = `{${field.fieldName}}`;
    
    if (prompt.includes(placeholder)) {
      const value = (field.fieldValue as any).value || '';
      prompt = prompt.replace(new RegExp(`\\{${escapedFieldName}\\}`, 'g'), value);
    }
  });

  return prompt;
}

/**
 * Collects file assets from task fields
 */
function collectAssetsFromFields(fields: TaskField[]): Array<{ type: string; url: string; filename: string }> {
  const assets: Array<{ type: string; url: string; filename: string }> = [];

  fields.forEach((field) => {
    if (field.fieldType === 'file') {
      const fileData = field.fieldValue as { filename?: string; path?: string; url?: string };
      if (fileData.url || fileData.path) {
        assets.push({
          type: 'file',
          url: fileData.url || fileData.path || '',
          filename: fileData.filename || field.fieldName,
        });
      }
    }
  });

  return assets;
}

/**
 * Builds additional fields section from task fields
 */
function buildAdditionalFieldsSection(
  fields: TaskField[],
  requiredFields: string[]
): string {
  const additionalFields: string[] = [];

  fields.forEach((f) => {
    // Skip required fields (already in template)
    if (requiredFields.includes(f.fieldName)) return;
    // Skip file fields (handled in assets)
    if (f.fieldType === 'file') return;
    
    // Get value once
    const value = (f.fieldValue as any)?.value || '';
    const trimmedValue = value.trim();
    
    // Only include fields with actual values
    if (trimmedValue.length > 0) {
      const line = `${f.fieldName}: ${value}`;
      // Additional safety check (shouldn't be needed, but just in case)
      if (!line.endsWith(':')) {
        additionalFields.push(line);
      }
    }
  });

  return additionalFields.join('\n');
}

/**
 * Builds prompt settings sections from PromptSettings
 */
function buildPromptSettingsSections(settings: PromptSettings): string[] {
  const settingsSections: string[] = [];

  // Video settings
  const videoSettings: string[] = [];
  if (settings.orientation) {
    videoSettings.push(`- Orientation: ${settings.orientation}`);
  }
  if (settings.duration) {
    videoSettings.push(`- Duration: ${settings.duration}`);
  }
  if (settings.movement) {
    videoSettings.push(`- Movement: ${settings.movement}`);
  }
  if (settings.sceneTransitions) {
    videoSettings.push(`- Scene Transitions: ${settings.sceneTransitions}`);
  }
  if (settings.background) {
    videoSettings.push(`- Background: ${settings.background}`);
  }
  if (settings.hasAvatar !== undefined) {
    videoSettings.push(`- Avatar: ${settings.hasAvatar ? 'Yes' : 'No'}`);
  }
  if (videoSettings.length > 0) {
    settingsSections.push(`Video Settings:\n${videoSettings.join('\n')}`);
  }

  // Audio settings
  const audioSettings: string[] = [];
  if (settings.voice) {
    audioSettings.push(`- Voice: ${settings.voice}`);
  }
  if (settings.language) {
    audioSettings.push(`- Language: ${settings.language}`);
  }
  if (settings.hasVoiceOver !== undefined) {
    if (settings.hasVoiceOver === false) {
      audioSettings.push(`- Voice over volume: 0 (no voice narration)`);
    } else {
      audioSettings.push(`- Voice over: Yes`);
    }
  }
  if (audioSettings.length > 0) {
    settingsSections.push(`Audio Settings:\n${audioSettings.join('\n')}`);
  }

  // Text settings
  const textSettings: string[] = [];
  if (settings.hasText && settings.textContent) {
    textSettings.push(`- On-screen text: ${settings.textContent}`);
  }
  if (settings.textToRead) {
    textSettings.push(`- Text to read: ${settings.textToRead}`);
  }
  if (textSettings.length > 0) {
    settingsSections.push(`Text Settings:\n${textSettings.join('\n')}`);
  }

  // Additional requirements
  if (settings.additionalRequirements) {
    settingsSections.push(`Additional Requirements:\n${settings.additionalRequirements}`);
  }

  return settingsSections;
}

/**
 * Adds content type label to the beginning of prompt if not already present
 */
function addContentTypeToPrompt(prompt: string, contentType: string): string {
  const contentTypeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1).replace(/_/g, ' ');
  if (!prompt.toLowerCase().includes(contentType.toLowerCase())) {
    prompt = `${contentTypeLabel}\n\n${prompt}`;
  }
  return prompt;
}

/**
 * Core function to build prompt from template and fields
 */
function buildBasePrompt(options: BuildPromptOptions): { prompt: string; assets: Array<{ type: string; url: string; filename: string }> } {
  const { task, config, platform, publicationContent, publicationNote, settings } = options;
  const requiredFields = (config.requiredFields as string[]) || [];

  // config.promptTemplate is already validated in calling functions
  let prompt = config.promptTemplate!;

  // Replace placeholders in template
  prompt = replacePlaceholdersInTemplate(prompt, task.fields, platform);

  // Collect file assets
  const assets = collectAssetsFromFields(task.fields);

  // Add publication-specific content if available
  if (publicationContent && publicationContent.trim().length > 0) {
    prompt += `\n\nPublication-specific content:\n${publicationContent.trim()}`;
  }

  if (publicationNote && publicationNote.trim().length > 0) {
    prompt += `\n\nNote: ${publicationNote.trim()}`;
  }

  // Add additional fields that are not in template
  const additionalFields = buildAdditionalFieldsSection(task.fields, requiredFields);
  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }

  // Add settings to prompt if provided
  if (settings) {
    // Goal description (first, if provided)
    if (settings.goalDescription) {
      prompt = `${settings.goalDescription}\n\n${prompt}`;
    }

    // Build and append settings sections
    const settingsSections = buildPromptSettingsSections(settings);
    if (settingsSections.length > 0) {
      prompt += `\n\n${settingsSections.join('\n\n')}`;
    }
  }

  // Clean up the prompt: remove unused placeholders, empty lines, and boilerplate
  prompt = cleanPrompt(prompt);

  return { prompt, assets };
}

export async function generatePrompt(taskId: string): Promise<PromptData> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      fields: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Get content type configuration
  const config = await prisma.contentTypeConfig.findUnique({
    where: { contentType: task.contentType },
  });

  if (!config || !config.promptTemplate) {
    throw new Error(`No prompt template configured for content type: ${task.contentType}`);
  }

  // Build base prompt
  const { prompt, assets } = buildBasePrompt({
    task,
    config,
    platform: null,
    publicationContent: null,
    publicationNote: null,
    settings: undefined,
  });

  // Add content type at the beginning if not already present
  const finalPrompt = addContentTypeToPrompt(prompt, task.contentType);

  return {
    prompt: finalPrompt.trim(),
    assets,
  };
}

export async function generatePromptForPublication(
  taskId: string,
  publicationId: string,
  settings?: PromptSettings
): Promise<PromptData> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      fields: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const publication = await prisma.taskPublication.findUnique({
    where: { id: publicationId },
  });

  if (!publication || publication.taskId !== taskId) {
    throw new Error('Publication not found or does not belong to task');
  }

  // Get content type configuration - use publication contentType if available, otherwise task contentType
  const contentType = publication.contentType || task.contentType;
  const config = await prisma.contentTypeConfig.findUnique({
    where: { contentType },
  });

  if (!config || !config.promptTemplate) {
    throw new Error(`No prompt template configured for content type: ${contentType}`);
  }

  // Get platform info for context
  const platform = await prisma.platform.findUnique({
    where: { code: publication.platform },
  });

  // Build base prompt with publication-specific options
  const { prompt, assets } = buildBasePrompt({
    task,
    config,
    platform,
    publicationContent: publication.content,
    publicationNote: publication.note,
    settings,
  });

  // Add content type at the beginning if not already present
  const finalPrompt = addContentTypeToPrompt(prompt, contentType);

  return {
    prompt: finalPrompt.trim(),
    assets,
  };
}

