import { GenerationRequest } from '../types/scene-generation';
import { phase0ResourceUnderstanding } from './phase0-resource-understanding';
import { phase1ScenarioGeneration } from './phase1-scenario-generation';
import { phase2SceneProjectConstruction } from './phase2-scene-project-construction';
import { phase3ScenePipelines } from './phase3-scene-pipelines';
import { phase4FinalComposition } from './phase4-final-composition';
import { RenderedScene } from '../pipelines/video-pipeline';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import {
  emitProgress,
  emitPhaseChange,
  emitSceneComplete,
  emitGenerationComplete,
  emitError,
} from '../websocket/scene-generation-socket';

/**
 * Orchestrator coordinates execution of all phases
 */
export async function executeGeneration(generationId: string, request: GenerationRequest): Promise<void> {
  logger.info({ 
    generationId, 
    prompt: request.prompt?.substring(0, 100),
    hasVideos: !!request.videos?.length,
    hasImages: !!request.images?.length,
    hasReferences: !!request.references?.length,
  }, 'Starting generation orchestration');

  try {
    emitProgress(generationId, 0, 'phase0');
    logger.info({ generationId, phase: 'phase0', progress: 0 }, 'Phase 0: Resource Understanding - Starting');

    // Phase 0: Resource Understanding
    const enrichedContext = await phase0ResourceUnderstanding(generationId, request);
    logger.info({ 
      generationId, 
      phase: 'phase0', 
      progress: 20,
      hasVideoTranscripts: !!Object.keys(enrichedContext.videoTranscripts || {}).length,
      hasVideoMetadata: !!Object.keys(enrichedContext.videoMetadata || {}).length,
      hasImageCaptions: !!Object.keys(enrichedContext.imageCaptions || {}).length,
    }, 'Phase 0: Resource Understanding - Completed');
    
    emitPhaseChange(generationId, 'phase1', 20);

    // Phase 1: Scenario Generation
    logger.info({ generationId, phase: 'phase1', progress: 20 }, 'Phase 1: Scenario Generation - Starting');
    const scenario = await phase1ScenarioGeneration(generationId, enrichedContext);
    logger.info({ 
      generationId, 
      phase: 'phase1', 
      progress: 40,
      timelineLength: scenario.timeline?.length || 0,
    }, 'Phase 1: Scenario Generation - Completed');
    
    // Check if review is required
    const generation = await prisma.sceneGeneration.findUnique({
      where: { id: generationId },
      select: { reviewScenario: true },
    });

    logger.info({ 
      generationId, 
      reviewScenario: generation?.reviewScenario,
      reviewScenarioType: typeof generation?.reviewScenario,
    }, 'Checking if review is required after Phase 1');

    if (generation?.reviewScenario === true) {
      // Stop and wait for review
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'waiting_for_review',
          phase: 'phase1',
          progress: 40,
        },
      });
      logger.info({ generationId }, 'Generation paused for scenario review');
      return; // Exit - will continue via continueGeneration endpoint
    } else {
      logger.info({ generationId, reviewScenario: generation?.reviewScenario }, 'Review not required, continuing to Phase 2');
    }
    
    emitPhaseChange(generationId, 'phase2', 40);

    // Phase 2: Scene Project Construction
    logger.info({ generationId, phase: 'phase2', progress: 40 }, 'Phase 2: Scene Project Construction - Starting');
    const sceneProjects = await phase2SceneProjectConstruction(generationId, scenario, request);
    logger.info({ 
      generationId, 
      phase: 'phase2', 
      progress: 60,
      sceneProjectsCount: sceneProjects.length,
    }, 'Phase 2: Scene Project Construction - Completed');
    
    emitPhaseChange(generationId, 'phase3', 60);

    // Phase 3: Scene Pipelines
    logger.info({ generationId, phase: 'phase3', progress: 60 }, 'Phase 3: Scene Pipelines - Starting');
    const renderedScenes = await phase3ScenePipelines(generationId, sceneProjects);
    logger.info({ 
      generationId, 
      phase: 'phase3', 
      progress: 80,
      renderedScenesCount: renderedScenes.length,
      renderedSceneIds: renderedScenes.map(s => s.sceneId),
    }, 'Phase 3: Scene Pipelines - Completed');
    
    // Note: Scene completion events are already emitted in phase3ScenePipelines
    
    // Check if scene review is required
    const generationAfterPhase3 = await prisma.sceneGeneration.findUnique({
      where: { id: generationId },
      select: { reviewScenes: true },
    });

    if (generationAfterPhase3?.reviewScenes) {
      // Stop and wait for scene review
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'waiting_for_scene_review',
          phase: 'phase3',
          progress: 80,
        },
      });
      logger.info({ generationId }, 'Generation paused for scene review');
      return; // Exit - will continue via continueGeneration endpoint
    }
    
    emitPhaseChange(generationId, 'phase4', 80);

    // Phase 4: Final Composition
    logger.info({ generationId, phase: 'phase4', progress: 80 }, 'Phase 4: Final Composition - Starting');
    const finalResult = await phase4FinalComposition(generationId, renderedScenes);
    logger.info({ 
      generationId, 
      phase: 'phase4', 
      progress: 100,
      resultUrl: finalResult.resultUrl,
      resultPath: finalResult.resultPath,
    }, 'Phase 4: Final Composition - Completed');

    // Mark as completed
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'completed',
        phase: 'phase4',
        progress: 100,
        completedAt: new Date(),
        resultUrl: finalResult.resultUrl,
        resultPath: finalResult.resultPath,
      },
    });

    emitGenerationComplete(generationId, finalResult.resultUrl);
    emitProgress(generationId, 100, 'phase4');

    logger.info({ 
      generationId, 
      resultUrl: finalResult.resultUrl,
      resultPath: finalResult.resultPath,
    }, 'Generation orchestration completed successfully');
  } catch (error: any) {
    logger.error({ 
      error: error.message || error, 
      errorStack: error.stack,
      generationId,
      phase: (await prisma.sceneGeneration.findUnique({ where: { id: generationId }, select: { phase: true } }))?.phase || 'unknown',
    }, 'Generation orchestration failed');
    emitError(generationId, error.message || String(error));
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        error: error.message || String(error),
      },
    });
    throw error;
  }
}

/**
 * Continue generation after review
 * Resumes from the appropriate phase based on current status
 */
export async function continueGeneration(generationId: string): Promise<void> {
  try {
    const generation = await prisma.sceneGeneration.findUnique({
      where: { id: generationId },
      include: { scenes: true },
    });

    if (!generation) {
      throw new Error('Generation not found');
    }

    if (generation.status === 'waiting_for_review') {
      // Continue from Phase 2 after scenario review
      logger.info({ generationId }, 'Continuing generation from Phase 2 after scenario review');
      
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'processing',
          phase: 'phase2',
          progress: 40,
        },
      });

      // Get scenario and request from database
      const scenario = generation.scenario as any;
      if (!scenario || !scenario.timeline) {
        throw new Error('Scenario not found or invalid');
      }

      // Reconstruct request from generation data
      // Use default aspect ratio (same as in phase2: 5.83 if not specified)
      const request: GenerationRequest = {
        prompt: generation.prompt || '',
        aspectRatio: 5.83, // Default aspect ratio (matches phase2 default)
        reviewScenario: generation.reviewScenario,
        reviewScenes: generation.reviewScenes,
      };

      emitPhaseChange(generationId, 'phase2', 40);

      // Continue from Phase 2
      const sceneProjects = await phase2SceneProjectConstruction(generationId, scenario, request);
      logger.info({ 
        generationId, 
        phase: 'phase2', 
        progress: 60,
        sceneProjectsCount: sceneProjects.length,
      }, 'Phase 2: Scene Project Construction - Completed');
      
      emitPhaseChange(generationId, 'phase3', 60);

      // Phase 3: Scene Pipelines
      logger.info({ generationId, phase: 'phase3', progress: 60 }, 'Phase 3: Scene Pipelines - Starting');
      const renderedScenes = await phase3ScenePipelines(generationId, sceneProjects);
      logger.info({ 
        generationId, 
        phase: 'phase3', 
        progress: 80,
        renderedScenesCount: renderedScenes.length,
        renderedSceneIds: renderedScenes.map(s => s.sceneId),
      }, 'Phase 3: Scene Pipelines - Completed');
      
      // Check if scene review is required
      if (generation.reviewScenes) {
        await prisma.sceneGeneration.update({
          where: { id: generationId },
          data: {
            status: 'waiting_for_scene_review',
            phase: 'phase3',
            progress: 80,
          },
        });
        logger.info({ generationId }, 'Generation paused for scene review');
        return;
      }
      
      emitPhaseChange(generationId, 'phase4', 80);

      // Phase 4: Final Composition
      logger.info({ generationId, phase: 'phase4', progress: 80 }, 'Phase 4: Final Composition - Starting');
      const finalResult = await phase4FinalComposition(generationId, renderedScenes);
      logger.info({ 
        generationId, 
        phase: 'phase4', 
        progress: 100,
        resultUrl: finalResult.resultUrl,
        resultPath: finalResult.resultPath,
      }, 'Phase 4: Final Composition - Completed');

      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          phase: 'phase4',
          progress: 100,
          completedAt: new Date(),
          resultUrl: finalResult.resultUrl,
          resultPath: finalResult.resultPath,
        },
      });

      emitGenerationComplete(generationId, finalResult.resultUrl);
      emitProgress(generationId, 100, 'phase4');

    } else if (generation.status === 'waiting_for_scene_review') {
      // Continue from Phase 4 after scene review
      logger.info({ generationId }, 'Continuing generation from Phase 4 after scene review');
      
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'processing',
          phase: 'phase4',
          progress: 80,
        },
      });

      // Get rendered scenes from database
      const completedScenes = await prisma.scene.findMany({
        where: {
          sceneGenerationId: generationId,
          status: 'completed',
          renderedAssetPath: { not: null },
          renderedAssetUrl: { not: null },
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      if (completedScenes.length === 0) {
        throw new Error('No completed scenes available for composition');
      }

      const renderedScenes = completedScenes
        .filter(scene => scene.renderedAssetPath && scene.renderedAssetUrl)
        .map(scene => ({
          sceneId: scene.sceneId,
          renderedAssetPath: scene.renderedAssetPath!,
          renderedAssetUrl: scene.renderedAssetUrl!,
          duration: 0, // Could be calculated if needed
        }));

      emitPhaseChange(generationId, 'phase4', 80);

      // Phase 4: Final Composition
      logger.info({ generationId, phase: 'phase4', progress: 80 }, 'Phase 4: Final Composition - Starting');
      const finalResult = await phase4FinalComposition(generationId, renderedScenes);
      logger.info({ 
        generationId, 
        phase: 'phase4', 
        progress: 100,
        resultUrl: finalResult.resultUrl,
        resultPath: finalResult.resultPath,
      }, 'Phase 4: Final Composition - Completed');

      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          phase: 'phase4',
          progress: 100,
          completedAt: new Date(),
          resultUrl: finalResult.resultUrl,
          resultPath: finalResult.resultPath,
        },
      });

      emitGenerationComplete(generationId, finalResult.resultUrl);
      emitProgress(generationId, 100, 'phase4');

    } else {
      throw new Error(`Cannot continue generation: invalid status ${generation.status}`);
    }
  } catch (error: any) {
    logger.error({ 
      error: error.message || error, 
      errorStack: error.stack,
      generationId,
    }, 'Generation continuation failed');
    emitError(generationId, error.message || String(error));
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'failed',
        error: error.message || String(error),
      },
    });
    throw error;
  }
}

