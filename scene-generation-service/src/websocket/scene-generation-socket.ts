import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../config/logger';

export interface SocketEvents {
  'progress': { generationId: string; progress: number; phase: string };
  'phase-change': { generationId: string; phase: string; progress: number };
  'scene-complete': { generationId: string; sceneId: string; sceneUrl: string };
  'generation-complete': { generationId: string; resultUrl: string };
  'error': { generationId: string; error: string };
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  const namespace = io.of('/scene-generation');

  namespace.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected to scene-generation namespace');

    // Join room for specific generation
    socket.on('join-generation', (generationId: string) => {
      socket.join(`generation-${generationId}`);
      logger.info({ socketId: socket.id, generationId }, 'Client joined generation room');
    });

    // Leave room
    socket.on('leave-generation', (generationId: string) => {
      socket.leave(`generation-${generationId}`);
      logger.info({ socketId: socket.id, generationId }, 'Client left generation room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });

  logger.info('Socket.IO initialized for scene-generation namespace');
  return io;
}

/**
 * Get Socket.IO instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit progress update to generation room
 */
export function emitProgress(generationId: string, progress: number, phase: string): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping progress emit');
    return;
  }

  io.of('/scene-generation').to(`generation-${generationId}`).emit('progress', {
    generationId,
    progress,
    phase,
  });

  logger.debug({ generationId, progress, phase }, 'Emitted progress update');
}

/**
 * Emit phase change event
 */
export function emitPhaseChange(generationId: string, phase: string, progress: number): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping phase change emit');
    return;
  }

  io.of('/scene-generation').to(`generation-${generationId}`).emit('phase-change', {
    generationId,
    phase,
    progress,
  });

  logger.debug({ generationId, phase, progress }, 'Emitted phase change');
}

/**
 * Emit scene completion event
 */
export function emitSceneComplete(generationId: string, sceneId: string, sceneUrl: string): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping scene complete emit');
    return;
  }

  io.of('/scene-generation').to(`generation-${generationId}`).emit('scene-complete', {
    generationId,
    sceneId,
    sceneUrl,
  });

  logger.debug({ generationId, sceneId }, 'Emitted scene complete');
}

/**
 * Emit generation completion event
 */
export function emitGenerationComplete(generationId: string, resultUrl: string): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping generation complete emit');
    return;
  }

  io.of('/scene-generation').to(`generation-${generationId}`).emit('generation-complete', {
    generationId,
    resultUrl,
  });

  logger.debug({ generationId }, 'Emitted generation complete');
}

/**
 * Emit error event
 */
export function emitError(generationId: string, error: string): void {
  if (!io) {
    logger.warn('Socket.IO not initialized, skipping error emit');
    return;
  }

  io.of('/scene-generation').to(`generation-${generationId}`).emit('error', {
    generationId,
    error,
  });

  logger.debug({ generationId, error }, 'Emitted error');
}

