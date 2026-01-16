import { Queue, Worker } from 'bullmq';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { executeGeneration } from '../services/orchestrator';
import { GenerationRequest } from '../types/scene-generation';
import { prisma } from '../database/prisma';

// Parse Redis URL
const parseRedisUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const connection: any = {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
    };
    
    // Extract password if present (format: redis://:password@host:port or redis://username:password@host:port)
    if (parsed.password) {
      connection.password = parsed.password;
    }
    
    // Extract username if present
    if (parsed.username && parsed.username !== 'default' && parsed.username !== '') {
      connection.username = parsed.username;
    }
    
    return connection;
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};

const connection = parseRedisUrl(config.REDIS_URL);

// Create queue with error handling for Redis connection
let sceneGenerationQueue: Queue;
let sceneGenerationWorker: Worker;

try {
  sceneGenerationQueue = new Queue('scene-generation', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100, // Keep max 100 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    },
  });

  sceneGenerationWorker = new Worker(
    'scene-generation',
    async (job) => {
      logger.info({ jobId: job.id, jobName: job.name }, 'Processing scene generation job');

      try {
        if (job.name === 'continue') {
          // Handle generation continuation after review
          const { generationId } = job.data as {
            generationId: string;
          };

          const { continueGeneration } = await import('../services/orchestrator');
          await continueGeneration(generationId);
          logger.info({ jobId: job.id, generationId }, 'Generation continuation completed');
        } else if (job.name === 'regenerate-scene') {
          // Handle scene regeneration
          const { generationId, sceneId, sceneProject } = job.data as {
            generationId: string;
            sceneId: string;
            sceneProject: any;
          };

          const { pipelineRegistry } = await import('../pipelines/pipeline-registry');
          const { createStorageAdapter } = await import('@elemental-content/shared-ai-lib');
          const { emitSceneComplete } = await import('../websocket/scene-generation-socket');
          const os = await import('os');
          const path = await import('path');

          const storage = createStorageAdapter();
          const tempDir = path.join(os.tmpdir(), `regeneration-${generationId}-${sceneId}`);
          const fs = await import('fs');

          // Create temp directory if it doesn't exist
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          try {
            const renderContext = {
              storage,
              tempDir,
            };

            // Render scene
            const renderedScene = await pipelineRegistry.render(sceneProject, renderContext);

            // Update scene with rendered asset
            await prisma.scene.update({
              where: { id: sceneId },
              data: {
                status: 'completed',
                progress: 100,
                renderedAssetPath: renderedScene.renderedAssetPath,
                renderedAssetUrl: renderedScene.renderedAssetUrl,
                error: null,
              },
            });

            emitSceneComplete(generationId, renderedScene.sceneId, renderedScene.renderedAssetUrl);
            logger.info({ jobId: job.id, sceneId }, 'Scene regeneration completed');
          } finally {
            // Cleanup temp directory
            try {
              if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
              }
            } catch (cleanupError) {
              logger.warn({ error: cleanupError, tempDir }, 'Failed to cleanup temp directory');
            }
          }
        } else {
          // Handle full generation
          const { generationId, request } = job.data as {
            generationId: string;
            request: GenerationRequest;
          };

          await executeGeneration(generationId, request);
          logger.info({ jobId: job.id, generationId }, 'Scene generation job completed');
        }
      } catch (error: any) {
        logger.error({ error, jobId: job.id, jobName: job.name }, 'Scene generation job failed');
        throw error;
      }
    },
    {
      connection,
      concurrency: 1, // Process one job at a time for now
    }
  );

  sceneGenerationWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  sceneGenerationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Job failed');
  });

  sceneGenerationWorker.on('error', (err) => {
    // Log as warning if it's a connection issue, error otherwise
    if (err.message?.includes('connect') || err.message?.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
      logger.warn({ error: err.message || err }, 'Scene generation worker Redis connection issue (will retry)');
    } else {
      logger.error({ error: err }, 'Scene generation worker error');
    }
  });

  sceneGenerationQueue.on('error', (err) => {
    // Log as warning if it's a connection issue, error otherwise
    if (err.message?.includes('connect') || err.message?.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
      logger.warn({ error: err.message || err }, 'Scene generation queue Redis connection issue (will retry)');
    } else {
      logger.error({ error: err }, 'Scene generation queue error');
    }
  });

  logger.info('Scene generation queue and worker initialized');
} catch (error: any) {
  logger.error({ error: error.message }, 'Failed to initialize Redis connection for scene generation');
  logger.warn('Scene generation will work in synchronous mode (without queue)');
  
  // Create dummy queue and worker that will fail gracefully
  sceneGenerationQueue = {
    add: async () => {
      throw new Error('Redis not available - scene generation queue is disabled');
    },
    close: async () => {},
  } as any;
  
  sceneGenerationWorker = {
    close: async () => {},
  } as any;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down scene generation worker');
  try {
    await sceneGenerationWorker.close();
    await sceneGenerationQueue.close();
  } catch (error) {
    logger.error({ error }, 'Error during worker shutdown');
  }
});

process.on('SIGINT', async () => {
  logger.info('Shutting down scene generation worker');
  try {
    await sceneGenerationWorker.close();
    await sceneGenerationQueue.close();
  } catch (error) {
    logger.error({ error }, 'Error during worker shutdown');
  }
});

export { sceneGenerationQueue, sceneGenerationWorker };
