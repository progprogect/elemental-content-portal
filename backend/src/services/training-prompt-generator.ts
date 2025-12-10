import { prisma } from '../utils/prisma';

export interface HeyGenPromptData {
  prompt: string;
}

/**
 * Generates a prompt for HeyGen Video Agent based on training topic
 * Includes technical requirements and presentation script
 */
export async function generateHeyGenPrompt(topicId: string): Promise<HeyGenPromptData> {
  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!topic) {
    throw new Error('Topic not found');
  }

  if (!topic.presentationScript || topic.presentationScript.trim().length === 0) {
    throw new Error('Topic must have a presentation script to generate a prompt');
  }

  // Build prompt with technical requirements and presentation script
  let prompt = `Create an educational video based on the following requirements:\n\n`;

  // Add topic information
  prompt += `Topic: ${topic.title}\n`;
  if (topic.description) {
    prompt += `Description: ${topic.description}\n`;
  }

  // Add target roles/competencies if available
  if (topic.roles && topic.roles.length > 0) {
    const roleNames = topic.roles.map(tr => tr.role.name).join(', ');
    prompt += `Target Audience/Roles: ${roleNames}\n`;
  }

  prompt += `\n---\n\n`;
  prompt += `Presentation Script:\n\n`;
  prompt += topic.presentationScript;

  return {
    prompt: prompt.trim(),
  };
}

