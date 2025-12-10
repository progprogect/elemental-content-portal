import { prisma } from '../utils/prisma';

export interface GensparkPromptData {
  prompt: string;
}

/**
 * Generates a prompt for Genspark Superagent based on training topic
 * Includes technical requirements and presentation script
 */
export async function generateGensparkPrompt(topicId: string): Promise<GensparkPromptData> {
  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
    include: {
      roles: {
        include: {
          trainingRole: true,
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
  let prompt = `Create a comprehensive educational presentation based on the following requirements:\n\n`;

  // Add presentation requirements
  prompt += `PRESENTATION REQUIREMENTS:\n\n`;
  prompt += `Create a detailed presentation that thoroughly covers all topics in the lesson.\n\n`;
  prompt += `Use a clean, professional healthcare-themed design with white/blue/teal colors.\n\n`;
  prompt += `Professional medical style, minimalistic, high contrast, readable.\n\n`;
  prompt += `Include smooth slide transitions.\n\n`;
  prompt += `Each slide should clearly present key concepts and information.\n\n`;
  prompt += `Use engaging visuals: icons, diagrams, checkmarks, clean illustrations.\n\n`;
  prompt += `IMPORTANT: Ensure that all content fits well within the slide area. Content should not overflow or extend beyond slide boundaries. If needed, compress content or reduce the amount of content per slide to ensure everything fits properly within the slide zone.\n\n`;
  prompt += `Make the presentation comprehensive and educational.\n\n`;
  prompt += `---\n\n`;

  // Add topic information
  prompt += `Topic: ${topic.title}\n`;
  if (topic.description) {
    prompt += `Description: ${topic.description}\n`;
  }

  // Add target roles/competencies if available
  if (topic.roles && topic.roles.length > 0) {
    const roleNames = topic.roles.map(tr => tr.trainingRole.name).join(', ');
    prompt += `Target Audience/Roles: ${roleNames}\n`;
  }

  prompt += `\n---\n\n`;
  prompt += `Presentation Script:\n\n`;
  prompt += topic.presentationScript;

  return {
    prompt: prompt.trim(),
  };
}

