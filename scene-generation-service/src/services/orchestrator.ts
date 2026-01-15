import { GenerationRequest } from '../types/scene-generation';
import { phase0ResourceUnderstanding } from './phase0-resource-understanding';
import { phase1ScenarioGeneration } from './phase1-scenario-generation';
import { phase2SceneProjectConstruction } from './phase2-scene-project-construction';
import { phase3ScenePipelines } from './phase3-scene-pipelines';
import { phase4FinalComposition } from './phase4-final-composition';
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
  logger.info({ generationId }, 'Starting generation orchestration');

  try {
    emitProgress(generationId, 0, 'phase0');

    // Phase 0: Resource Understanding
    const enrichedContext = await phase0ResourceUnderstanding(generationId, request);
    emitPhaseChange(generationId, 'phase1', 20);

    // Phase 1: Scenario Generation
    const scenario = await phase1ScenarioGeneration(generationId, enrichedContext);
    emitPhaseChange(generationId, 'phase2', 40);

    // Phase 2: Scene Project Construction
    const sceneProjects = await phase2SceneProjectConstruction(generationId, scenario, request);
    emitPhaseChange(generationId, 'phase3', 60);

    // Phase 3: Scene Pipelines
    const renderedScenes = await phase3ScenePipelines(generationId, sceneProjects);
    
    // Note: Scene completion events are already emitted in phase3ScenePipelines
    
    emitPhaseChange(generationId, 'phase4', 80);

    // Phase 4: Final Composition
    const finalResult = await phase4FinalComposition(generationId, renderedScenes);

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

    logger.info({ generationId }, 'Generation orchestration completed');
  } catch (error: any) {
    logger.error({ error, generationId }, 'Generation orchestration failed');
    emitError(generationId, error.message);
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

