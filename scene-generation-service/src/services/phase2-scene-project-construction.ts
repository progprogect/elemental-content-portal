import { Scenario, SceneProject, GenerationRequest } from '../types/scene-generation';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';

/**
 * Phase 2: Scene Project Construction
 * Transforms Scenario into Scene Projects with render context and inputs
 */
export async function phase2SceneProjectConstruction(
  generationId: string,
  scenario: Scenario,
  request: GenerationRequest
): Promise<SceneProject[]> {
  logger.info({ generationId, sceneCount: scenario.timeline.length }, 'Starting Phase 2: Scene Project Construction');

  try {
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        phase: 'phase2',
        status: 'processing',
        progress: 40,
      },
    });

    const aspectRatio = request.aspectRatio || 5.83; // Default aspect ratio
    const targetFps = 30; // Default FPS

    // Calculate render dimensions based on aspect ratio
    // Standard width: 1920px, height calculated from aspect ratio
    const width = 1920;
    const height = Math.round(width / aspectRatio);

    const sceneProjects: SceneProject[] = [];

    // Process each scene in timeline
    for (let i = 0; i < scenario.timeline.length; i++) {
      const timelineItem = scenario.timeline[i];
      const progress = 40 + Math.floor((i / scenario.timeline.length) * 20);

      const sceneProject: SceneProject = {
        sceneId: timelineItem.id,
        kind: timelineItem.kind,
        scenarioItem: timelineItem,
        renderContext: {
          aspectRatio,
          width,
          height,
          fps: targetFps,
        },
        inputs: {},
        extra: {},
      };

      // Prepare inputs based on scene kind
      if (timelineItem.kind === 'video' || timelineItem.kind === 'overlay' || timelineItem.kind === 'pip') {
        if (timelineItem.sourceVideoId && timelineItem.fromSeconds !== undefined && timelineItem.toSeconds !== undefined) {
          sceneProject.inputs.video = {
            id: timelineItem.sourceVideoId,
            fromSeconds: timelineItem.fromSeconds,
            toSeconds: timelineItem.toSeconds,
          };
        }
      }

      // Add image inputs if specified in detailedRequest
      if (timelineItem.detailedRequest.imageHints && timelineItem.detailedRequest.imageHints.length > 0) {
        // Map image hints to actual image IDs from request
        const imageIds: string[] = [];
        if (request.images) {
          for (const hint of timelineItem.detailedRequest.imageHints) {
            // Try to match hint with image IDs (simplified matching)
            const matchedImage = request.images.find(img => img.id.includes(hint) || hint.includes(img.id));
            if (matchedImage) {
              imageIds.push(matchedImage.id);
            }
          }
        }
        if (imageIds.length > 0) {
          sceneProject.inputs.images = imageIds;
        }
      }

      // Add extra configuration based on scene kind
      if (timelineItem.kind === 'banner') {
        sceneProject.extra = {
          layoutPreset: timelineItem.detailedRequest.layoutHint || 'center',
          visualStyle: timelineItem.detailedRequest.visualStyle || [],
          textContent: timelineItem.detailedRequest.textContent,
          animationHints: timelineItem.detailedRequest.animationHints || [],
        };
      } else if (timelineItem.kind === 'overlay') {
        sceneProject.extra = {
          layoutHint: timelineItem.detailedRequest.layoutHint || 'side_panel_right',
          visualStyle: timelineItem.detailedRequest.visualStyle || [],
          audioStrategy: timelineItem.detailedRequest.audioStrategy || 'keep',
        };
      } else if (timelineItem.kind === 'pip') {
        sceneProject.extra = {
          position: 'top-right', // Default PiP position
          size: 'small', // Default PiP size
        };
      }

      sceneProjects.push(sceneProject);

      // Update progress
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: { progress },
      });
    }

    // Create Scene records in database for each scene project
    for (let i = 0; i < sceneProjects.length; i++) {
      const sceneProject = sceneProjects[i];
      await prisma.scene.create({
        data: {
          sceneGenerationId: generationId,
          sceneId: sceneProject.sceneId,
          kind: sceneProject.kind,
          status: 'pending',
          progress: 0,
          orderIndex: i,
          sceneProject: sceneProject as any,
        },
      });
    }

    // Update generation with scene projects
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        sceneProjects: sceneProjects as any,
        progress: 60,
      },
    });

    logger.info({ generationId, sceneProjectCount: sceneProjects.length }, 'Phase 2 completed');
    return sceneProjects;
  } catch (error: any) {
    logger.error({ error, generationId }, 'Phase 2 failed');
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

