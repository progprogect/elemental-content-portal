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

    prompt += `CRITICAL: You MUST return ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks.

Generate a JSON scenario with the following EXACT structure:
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

IMPORTANT RULES:
1. Return ONLY the JSON object, nothing else
2. Do NOT wrap it in markdown code blocks
3. Do NOT add any explanatory text before or after
4. Ensure all strings are properly escaped
5. Ensure all arrays and objects are properly formatted
6. The JSON must be valid and parseable`;

    // Generate scenario using LLM with custom configuration for JSON output
    // We need to call generateText but with a modified prompt that emphasizes JSON-only output
    // Since generateText doesn't support responseSchema directly, we'll rely on improved prompt and parsing
    const scenarioText = await generateText({
      basePrompt: prompt,
      tone: 'professional',
      length: 'long',
      additionalInstructions: 'CRITICAL: You must return ONLY valid JSON. No markdown, no explanations, no code blocks. Just the raw JSON object.',
    });

    // Parse JSON from response
    let scenario: Scenario;
    try {
      // Clean the text - remove markdown code blocks if present
      let cleanedText = scenarioText.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedText = jsonMatch[1].trim();
      }
      
      // Try to find JSON object boundaries (first { to last })
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
      // Try to parse
      scenario = JSON.parse(cleanedText);
    } catch (parseError: any) {
      logger.error({ error: parseError, scenarioText }, 'Failed to parse scenario JSON');
      
      // Try to fix common JSON issues
      try {
        let fixedText = scenarioText.trim();
        
        // Remove markdown code blocks
        fixedText = fixedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find JSON boundaries
        const firstBrace = fixedText.indexOf('{');
        const lastBrace = fixedText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          fixedText = fixedText.substring(firstBrace, lastBrace + 1);
          
          // Try to fix trailing commas
          fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
          
          scenario = JSON.parse(fixedText);
          logger.info({ generationId }, 'Successfully parsed JSON after fixing');
        } else {
          throw new Error('No JSON object found in response');
        }
      } catch (fixError: any) {
        logger.error({ error: fixError, scenarioText }, 'Failed to fix and parse scenario JSON');
        throw new Error(`Failed to parse scenario JSON: ${parseError.message}. Response was: ${scenarioText.substring(0, 500)}...`);
      }
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

