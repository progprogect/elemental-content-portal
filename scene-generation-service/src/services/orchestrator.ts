import { GenerationRequest } from '../types/scene-generation';
import { phase0ResourceUnderstanding } from './phase0-resource-understanding';
import { phase1ScenarioGeneration } from './phase1-scenario-generation';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';

/**
 * Orchestrator coordinates execution of all phases
 */
export async function executeGeneration(generationId: string, request: GenerationRequest): Promise<void> {
  logger.info({ generationId }, 'Starting generation orchestration');

  try {
    // Phase 0: Resource Understanding
    const enrichedContext = await phase0ResourceUnderstanding(generationId, request);

    // Phase 1: Scenario Generation
    const scenario = await phase1ScenarioGeneration(generationId, enrichedContext);

    // TODO: Phase 2-4 will be implemented later
    // For MVP, we stop after Phase 1

    // Mark as completed (for MVP)
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        status: 'completed',
        phase: 'phase1',
        progress: 100,
        completedAt: new Date(),
      },
    });

    logger.info({ generationId }, 'Generation orchestration completed');
  } catch (error: any) {
    logger.error({ error, generationId }, 'Generation orchestration failed');
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

