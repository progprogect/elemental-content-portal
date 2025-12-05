import { prisma } from '../utils/prisma';
import { PromptSettings } from '../types/prompt-settings';

export interface PromptData {
  prompt: string;
  assets: Array<{ type: string; url: string; filename: string }>;
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

  let prompt = config.promptTemplate;
  const requiredFields = (config.requiredFields as string[]) || [];
  const assets: Array<{ type: string; url: string; filename: string }> = [];

  // Replace placeholders in template
  task.fields.forEach((field) => {
    // Escape special regex characters in field name
    const escapedFieldName = field.fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = `{${field.fieldName}}`;
    
    if (prompt.includes(placeholder)) {
      const value = (field.fieldValue as any).value || '';
      prompt = prompt.replace(new RegExp(`\\{${escapedFieldName}\\}`, 'g'), value);
    }

    // Collect file assets
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

  // Add additional fields that are not in template
  // Only include fields with non-empty values (skip files, they're handled separately in assets)
  const additionalFields = task.fields
    .filter((f) => {
      // Skip required fields (already in template)
      if (requiredFields.includes(f.fieldName)) return false;
      // Skip file fields (handled in assets)
      if (f.fieldType === 'file') return false;
      // Only include fields with actual values
      const value = (f.fieldValue as any)?.value || '';
      return value.trim().length > 0;
    })
    .map((f) => {
      const value = (f.fieldValue as any).value || '';
      return `${f.fieldName}: ${value}`;
    })
    .filter(line => line.trim().length > 0 && !line.endsWith(':'))
    .join('\n');

  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }

  // Clean up the prompt: remove unused placeholders, empty lines, and boilerplate
  prompt = cleanPrompt(prompt);

  // Add content type at the beginning if not already present
  const contentTypeLabel = task.contentType.charAt(0).toUpperCase() + task.contentType.slice(1).replace(/_/g, ' ');
  if (!prompt.toLowerCase().includes(task.contentType.toLowerCase())) {
    prompt = `${contentTypeLabel}\n\n${prompt}`;
  }

  return {
    prompt: prompt.trim(),
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

  let prompt = config.promptTemplate;
  const requiredFields = (config.requiredFields as string[]) || [];
  const assets: Array<{ type: string; url: string; filename: string }> = [];

  // Add platform context to prompt if available
  if (platform) {
    // Replace {platform} placeholder if exists
    prompt = prompt.replace(/\{platform\}/gi, platform.name);
    prompt = prompt.replace(/\{platform_code\}/gi, platform.code);
  }

  // Replace placeholders in template with task fields
  task.fields.forEach((field) => {
    const escapedFieldName = field.fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = `{${field.fieldName}}`;
    
    if (prompt.includes(placeholder)) {
      const value = (field.fieldValue as any).value || '';
      prompt = prompt.replace(new RegExp(`\\{${escapedFieldName}\\}`, 'g'), value);
    }

    // Collect file assets
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

  // Add publication-specific content if available and not empty
  if (publication.content && publication.content.trim().length > 0) {
    prompt += `\n\nPublication-specific content:\n${publication.content.trim()}`;
  }

  if (publication.note && publication.note.trim().length > 0) {
    prompt += `\n\nNote: ${publication.note.trim()}`;
  }

  // Add additional fields that are not in template
  // Only include fields with non-empty values (skip files, they're handled separately in assets)
  const additionalFields = task.fields
    .filter((f) => {
      // Skip required fields (already in template)
      if (requiredFields.includes(f.fieldName)) return false;
      // Skip file fields (handled in assets)
      if (f.fieldType === 'file') return false;
      // Only include fields with actual values
      const value = (f.fieldValue as any)?.value || '';
      return value.trim().length > 0;
    })
    .map((f) => {
      const value = (f.fieldValue as any).value || '';
      return `${f.fieldName}: ${value}`;
    })
    .filter(line => line.trim().length > 0 && !line.endsWith(':'))
    .join('\n');

  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }

  // Add settings to prompt if provided
  if (settings) {
    const settingsSections: string[] = [];

    // Goal description (first, if provided)
    if (settings.goalDescription) {
      prompt = `${settings.goalDescription}\n\n${prompt}`;
    }

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

    // Append all settings sections to prompt
    if (settingsSections.length > 0) {
      prompt += `\n\n${settingsSections.join('\n\n')}`;
    }
  }

  // Clean up the prompt: remove unused placeholders, empty lines, and boilerplate
  prompt = cleanPrompt(prompt);

  // Add content type at the beginning if not already present
  const contentTypeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1).replace(/_/g, ' ');
  if (!prompt.toLowerCase().includes(contentType.toLowerCase())) {
    prompt = `${contentTypeLabel}\n\n${prompt}`;
  }

  return {
    prompt: prompt.trim(),
    assets,
  };
}

