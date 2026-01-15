import { Queue, Worker } from 'bullmq';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { executeGeneration } from '../services/orchestrator';
import { GenerationRequest } from '../types/scene-generation';

// Parse Redis URL
const parseRedisUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};

const connection = parseRedisUrl(config.REDIS_URL);

export const sceneGenerationQueue = new Queue('scene-generation', {
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

export const sceneGenerationWorker = new Worker(
  'scene-generation',
  async (job) => {
    const { generationId, request } = job.data as {
      generationId: string;
      request: GenerationRequest;
    };

    logger.info({ jobId: job.id, generationId }, 'Processing scene generation job');

    try {
      await executeGeneration(generationId, request);
      logger.info({ jobId: job.id, generationId }, 'Scene generation job completed');
    } catch (error: any) {
      logger.error({ error, jobId: job.id, generationId }, 'Scene generation job failed');
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down scene generation worker');
  await sceneGenerationWorker.close();
  await sceneGenerationQueue.close();
});

process.on('SIGINT', async () => {
  logger.info('Shutting down scene generation worker');
  await sceneGenerationWorker.close();
  await sceneGenerationQueue.close();
});

