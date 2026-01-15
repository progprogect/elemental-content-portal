import { EnrichedContext, Scenario } from '../types/scene-generation';
import { generateText } from '@elemental-content/shared-ai-lib';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';

/**
 * Phase 1: Scenario Generation
 * Uses LLM to generate scenario (timeline + per-scene descriptions) from enriched context
 */
export async function phase1ScenarioGeneration(
  generationId: string,
  enrichedContext: EnrichedContext
): Promise<Scenario> {
  logger.info({ generationId }, 'Starting Phase 1: Scenario Generation');

  try {
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        phase: 'phase1',
        status: 'processing',
        progress: 0,
      },
    });

    // Build prompt for scenario generation
    let prompt = `Generate a video scenario based on the following prompt and resources:

PROMPT: ${enrichedContext.prompt}

`;

    // Add video information
    if (Object.keys(enrichedContext.videoTranscripts).length > 0) {
      prompt += `VIDEO TRANSCRIPTS:\n`;
      for (const [videoId, transcript] of Object.entries(enrichedContext.videoTranscripts)) {
        prompt += `Video ${videoId}: ${transcript}\n\n`;
      }
    }

    if (Object.keys(enrichedContext.videoMetadata).length > 0) {
      prompt += `VIDEO METADATA:\n`;
      for (const [videoId, metadata] of Object.entries(enrichedContext.videoMetadata)) {
        prompt += `Video ${videoId}: ${metadata.duration}s, ${metadata.width}x${metadata.height}, ${metadata.fps}fps\n`;
      }
      prompt += '\n';
    }

    // Add image information
    if (Object.keys(enrichedContext.imageCaptions).length > 0) {
      prompt += `IMAGE DESCRIPTIONS:\n`;
      for (const [imageId, caption] of Object.entries(enrichedContext.imageCaptions)) {
        prompt += `Image ${imageId}: ${caption}\n`;
      }
      prompt += '\n';
    }

    // Add reference notes
    if (enrichedContext.referenceNotes) {
      prompt += `REFERENCE NOTES:\n${enrichedContext.referenceNotes}\n\n`;
    }

    prompt += `Generate a JSON scenario with the following structure:
{
  "timeline": [
    {
      "id": "scene_intro",
      "kind": "banner",
      "durationSeconds": 4,
      "detailedRequest": {
        "goal": "intro",
        "description": "Description of what should happen in this scene",
        "visualStyle": ["tech", "minimal"],
        "textContent": "Text to display",
        "animationHints": ["fade-in"]
      }
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;

    // Generate scenario using LLM
    const scenarioText = await generateText({
      basePrompt: prompt,
      tone: 'professional',
      length: 'long',
    });

    // Parse JSON from response
    let scenario: Scenario;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = scenarioText.match(/```json\s*([\s\S]*?)\s*```/) || scenarioText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : scenarioText;
      scenario = JSON.parse(jsonText);
    } catch (parseError: any) {
      logger.error({ error: parseError, scenarioText }, 'Failed to parse scenario JSON');
      throw new Error(`Failed to parse scenario: ${parseError.message}`);
    }

    // Validate scenario structure
    if (!scenario.timeline || !Array.isArray(scenario.timeline)) {
      throw new Error('Invalid scenario structure: missing timeline array');
    }

    // Update database
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        scenario: scenario as any,
        progress: 100,
      },
    });

    logger.info({ generationId, sceneCount: scenario.timeline.length }, 'Phase 1 completed');
    return scenario;
  } catch (error: any) {
    logger.error({ error, generationId }, 'Phase 1 failed');
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });
    throw error;
  }
}

