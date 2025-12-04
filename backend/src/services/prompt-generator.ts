import { prisma } from '../utils/prisma';

export interface PromptData {
  prompt: string;
  assets: Array<{ type: string; url: string; filename: string }>;
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
  const additionalFields = task.fields
    .filter((f) => !requiredFields.includes(f.fieldName))
    .map((f) => {
      const value = (f.fieldValue as any).value || '';
      return `${f.fieldName}: ${value}`;
    })
    .join('\n');

  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }

  return {
    prompt,
    assets,
  };
}

export async function generatePromptForPublication(
  taskId: string,
  publicationId: string
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

  // Add publication-specific content if available
  if (publication.content) {
    prompt += `\n\nPublication-specific content:\n${publication.content}`;
  }

  if (publication.note) {
    prompt += `\n\nNote: ${publication.note}`;
  }

  // Add additional fields that are not in template
  const additionalFields = task.fields
    .filter((f) => !requiredFields.includes(f.fieldName))
    .map((f) => {
      const value = (f.fieldValue as any).value || '';
      return `${f.fieldName}: ${value}`;
    })
    .join('\n');

  if (additionalFields) {
    prompt += `\n\nAdditional context:\n${additionalFields}`;
  }

  return {
    prompt,
    assets,
  };
}

