import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { logger } from '../utils/logger';

/**
 * Starts Scene Generation Service as an internal server on a separate port
 * This allows the service to run on the same server while maintaining encapsulation
 */
export function startSceneGenerationService(port: number = 3001) {
  try {
    // Dynamic imports to avoid loading issues if dependencies are missing
    const sceneGenerationApp = express();

    // Basic middleware
    sceneGenerationApp.use(cors({
      origin: (origin, callback) => {
        // Allow requests from main backend and frontend
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:5173',
          process.env.MAIN_BACKEND_URL || 'http://localhost:3000',
          'http://localhost:3000',
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all for now
        }
      },
      credentials: true,
    }));

    sceneGenerationApp.use(express.json());
    sceneGenerationApp.use(express.urlencoded({ extended: true }));

    // Health check
    sceneGenerationApp.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'scene-generation', timestamp: new Date().toISOString() });
    });

    // Import routes dynamically
    // Using relative path from backend/dist to scene-generation-service/dist
    const scenesRoutes = require('../../scene-generation-service/dist/api/routes/scenes.routes').default;
    sceneGenerationApp.use('/api/v1/scenes', scenesRoutes);

    // 404 handler (only if error handler wasn't added)
    // Note: error handler from scene-generation-service should handle 404s

    // Create HTTP server for Socket.IO
    const httpServer = createServer(sceneGenerationApp);

    // Initialize Socket.IO if available
    try {
      const { initializeSocketIO } = require('../../scene-generation-service/dist/websocket/scene-generation-socket');
      initializeSocketIO(httpServer);
      logger.info('Socket.IO initialized for Scene Generation Service');
    } catch (socketError: any) {
      logger.warn(`Socket.IO initialization skipped: ${socketError.message}`);
    }

    // Initialize job worker if available
    try {
      require('../../scene-generation-service/dist/jobs/scene-generation.job');
      logger.info('Scene generation job worker initialized');
    } catch (jobError: any) {
      logger.warn(`Job worker initialization skipped: ${jobError.message}`);
    }

    httpServer.listen(port, () => {
      logger.info(`Scene Generation Service started on internal port ${port}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down Scene Generation Service...');
      httpServer.close(() => {
        logger.info('Scene Generation Service stopped');
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return httpServer;
  } catch (error: any) {
    logger.error(`Failed to start Scene Generation Service: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
    // Don't throw - allow main backend to continue even if scene generation service fails
    return null;
  }
}

