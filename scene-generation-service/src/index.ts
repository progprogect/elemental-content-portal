import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './api/swagger/swagger';
import { errorHandler } from './api/middleware/error-handler';
import { requestLogger } from './api/middleware/request-logger';
import { apiRateLimiter } from './api/middleware/rate-limiter';
import { healthCheck } from './health/health-check';
import scenesRoutes from './api/routes/scenes.routes';
import { initializeSocketIO } from './websocket/scene-generation-socket';
import './jobs/scene-generation.job'; // Initialize worker

// dotenv.config() is called in config/env.ts

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.FRONTEND_URL,
      config.MAIN_BACKEND_URL,
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, can restrict later
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(apiRateLimiter);

// Health check
app.get('/health', healthCheck);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/v1/scenes', scenesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = config.PORT;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Scene Generation Service started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

