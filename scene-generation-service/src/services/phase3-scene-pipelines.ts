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

    // Log input data for Phase 3
    logger.info({ 
      generationId, 
      sceneProjectsCount: sceneProjects.length,
      sceneProjects: sceneProjects.map(sp => ({
        sceneId: sp.sceneId,
        kind: sp.kind,
        hasVideo: !!sp.inputs.video,
        hasImages: !!sp.inputs.images?.length,
        renderContext: sp.renderContext,
        extraKeys: Object.keys(sp.extra || {}),
      })),
      tempDir,
    }, 'Phase 3: Input data - SceneProjects received');

    // Process scenes in parallel (with concurrency limit)
    const concurrency = 3; // Process 3 scenes at a time
    for (let i = 0; i < sceneProjects.length; i += concurrency) {
      const batch = sceneProjects.slice(i, i + concurrency);
      
      logger.info({ 
        generationId, 
        batchIndex: i, 
        batchSize: batch.length,
        batchSceneIds: batch.map(sp => sp.sceneId),
      }, 'Phase 3: Processing batch of scenes');
      
      // Use Promise.allSettled to continue processing even if some scenes fail
      const batchResults = await Promise.allSettled(
        batch.map(async (sceneProject) => {
          // Log input SceneProject data
          logger.info({ 
            sceneId: sceneProject.sceneId, 
            kind: sceneProject.kind,
            generationId,
            sceneProjectInput: {
              sceneId: sceneProject.sceneId,
              kind: sceneProject.kind,
              renderContext: sceneProject.renderContext,
              inputs: {
                hasVideo: !!sceneProject.inputs.video,
                videoId: sceneProject.inputs.video?.id,
                videoSegment: sceneProject.inputs.video ? `${sceneProject.inputs.video.fromSeconds}-${sceneProject.inputs.video.toSeconds}s` : null,
                imageIds: sceneProject.inputs.images || [],
                imageCount: sceneProject.inputs.images?.length || 0,
              },
              extra: sceneProject.extra,
              scenarioItem: {
                id: sceneProject.scenarioItem.id,
                kind: sceneProject.scenarioItem.kind,
                durationSeconds: sceneProject.scenarioItem.durationSeconds,
                hasDetailedRequest: !!sceneProject.scenarioItem.detailedRequest,
              },
            },
          }, 'Phase 3: Starting render - SceneProject input data');
          
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
          }, 'Phase 3: Calling pipeline registry render');
          
          const renderedScene = await pipelineRegistry.render(sceneProject, renderContext);
          
          // Log output RenderedScene data
          logger.info({ 
            sceneId: sceneProject.sceneId,
            renderedSceneOutput: {
              sceneId: renderedScene.sceneId,
              renderedAssetPath: renderedScene.renderedAssetPath,
              renderedAssetUrl: renderedScene.renderedAssetUrl,
              duration: renderedScene.duration,
            },
            generationId,
          }, 'Phase 3: Render completed - RenderedScene output data');
          
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
          logger.info({ 
            sceneId: sceneProject.sceneId,
            renderedScene: result.value,
            generationId,
          }, 'Phase 3: Scene render succeeded - adding to renderedScenes array');
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

    // Check if we have any successfully rendered scenes
    if (renderedScenes.length === 0) {
      const allScenes = await prisma.scene.findMany({
        where: {
          sceneGenerationId: generationId,
        },
        select: {
          sceneId: true,
          status: true,
          error: true,
        },
      });

      const failedScenes = allScenes.filter(s => s.status === 'failed');
      const errorMessages = failedScenes.map(s => `${s.sceneId}: ${s.error || 'Unknown error'}`).join('; ');

      logger.error({
        generationId,
        totalScenes: allScenes.length,
        failedScenes: failedScenes.length,
        errorMessages,
      }, 'All scenes failed to render in Phase 3');

      await prisma.sceneGeneration.update({
        where: { id: generationId },
        data: {
          status: 'failed',
          progress: 80,
          error: `All ${allScenes.length} scenes failed to render. Errors: ${errorMessages}`,
        },
      });

      throw new Error(`All scenes failed to render. ${failedScenes.length} scenes failed. Errors: ${errorMessages}`);
    }

    await prisma.sceneGeneration.update({
      where: { id: generationId },
      data: {
        progress: 80,
      },
    });

    // Log final output summary
    logger.info({ 
      generationId, 
      renderedSceneCount: renderedScenes.length,
      totalScenes: sceneProjects.length,
      renderedScenes: renderedScenes.map(rs => ({
        sceneId: rs.sceneId,
        renderedAssetPath: rs.renderedAssetPath,
        renderedAssetUrl: rs.renderedAssetUrl,
        duration: rs.duration,
      })),
      allRenderedScenesHavePath: renderedScenes.every(rs => !!rs.renderedAssetPath),
      allRenderedScenesHaveUrl: renderedScenes.every(rs => !!rs.renderedAssetUrl),
      allRenderedScenesHaveDuration: renderedScenes.every(rs => rs.duration > 0),
    }, 'Phase 3 completed - Final output summary');
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

