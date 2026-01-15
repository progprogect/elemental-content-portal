import { SceneProject } from '../types/scene-generation';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { pipelineRegistry } from '../pipelines/pipeline-registry';
import { createStorageAdapter } from '@elemental-content/shared-ai-lib';
import { RenderedScene, RenderContext } from '../pipelines/video-pipeline';
import { emitProgress, emitSceneComplete } from '../websocket/scene-generation-socket';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Phase 3: Scene Pipelines
 * Renders individual scenes using appropriate pipelines
 */
export async function phase3ScenePipelines(
  generationId: string,
  sceneProjects: SceneProject[]
): Promise<RenderedScene[]> {
  logger.info({ generationId, sceneCount: sceneProjects.length }, 'Starting Phase 3: Scene Pipelines');

  try {
    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        phase: 'phase3',
        status: 'processing',
        progress: 60,
      },
    });

    const storage = createStorageAdapter();
    const tempDir = path.join(os.tmpdir(), `generation-${generationId}`);
    
    // Create temp directory if it doesn't exist
    if (!require('fs').existsSync(tempDir)) {
      require('fs').mkdirSync(tempDir, { recursive: true });
    }

    const renderContext: RenderContext = {
      storage,
      tempDir,
    };

    const renderedScenes: RenderedScene[] = [];

    // Process scenes in parallel (with concurrency limit)
    const concurrency = 3; // Process 3 scenes at a time
    for (let i = 0; i < sceneProjects.length; i += concurrency) {
      const batch = sceneProjects.slice(i, i + concurrency);
      
      // Use Promise.allSettled to continue processing even if some scenes fail
      const batchResults = await Promise.allSettled(
        batch.map(async (sceneProject) => {
          // Update scene status to processing
          await prisma.scene.updateMany({
            where: {
              sceneGenerationId: generationId,
              sceneId: sceneProject.sceneId,
            },
            data: {
              status: 'processing',
              progress: 0,
            },
          });

          // Render scene
          logger.info({ 
            sceneId: sceneProject.sceneId, 
            kind: sceneProject.scenarioItem.kind,
            generationId,
          }, 'Rendering scene');
          
          const renderedScene = await pipelineRegistry.render(sceneProject, renderContext);
          
          logger.info({ 
            sceneId: sceneProject.sceneId,
            renderedAssetPath: renderedScene.renderedAssetPath,
            renderedAssetUrl: renderedScene.renderedAssetUrl,
            duration: renderedScene.duration,
          }, 'Scene rendered, updating database');

          // Update scene with rendered asset
          await prisma.scene.updateMany({
            where: {
              sceneGenerationId: generationId,
              sceneId: sceneProject.sceneId,
            },
            data: {
              status: 'completed',
              progress: 100,
              renderedAssetPath: renderedScene.renderedAssetPath,
              renderedAssetUrl: renderedScene.renderedAssetUrl,
            },
          });

          logger.info({ 
            sceneId: sceneProject.sceneId,
            renderedAssetPath: renderedScene.renderedAssetPath,
            renderedAssetUrl: renderedScene.renderedAssetUrl,
          }, 'Scene database updated successfully');

          emitSceneComplete(generationId, renderedScene.sceneId, renderedScene.renderedAssetUrl);
          logger.info({ sceneId: sceneProject.sceneId }, 'Scene rendered successfully');
          return renderedScene;
        })
      );

      // Process results: add successful scenes, handle failures
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const sceneProject = batch[j];
        
        if (result.status === 'fulfilled') {
          renderedScenes.push(result.value);
        } else {
          // Scene failed - already logged in pipeline, just update status
          logger.error({ error: result.reason, sceneId: sceneProject.sceneId }, 'Scene render failed');
          await prisma.scene.updateMany({
            where: {
              sceneGenerationId: generationId,
              sceneId: sceneProject.sceneId,
            },
            data: {
              status: 'failed',
              error: result.reason?.message || 'Unknown error',
            },
          });
        }
      }

      // Update overall progress
      const progress = 60 + Math.floor(((i + batch.length) / sceneProjects.length) * 20);
      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: { progress },
      });
      emitProgress(generationId, progress, 'phase3');
    }

    // Cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      logger.warn({ error: cleanupError, tempDir }, 'Failed to cleanup temp directory');
    }

    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        progress: 80,
      },
    });

    logger.info({ generationId, renderedSceneCount: renderedScenes.length }, 'Phase 3 completed');
    return renderedScenes;
  } catch (error: any) {
    logger.error({ error, generationId }, 'Phase 3 failed');
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

