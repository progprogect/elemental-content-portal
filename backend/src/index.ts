import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from frontend, extension (chrome-extension://), and Haygen domains
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      /^chrome-extension:\/\/.*$/,
      /^https?:\/\/.*\.heygen\.com$/,
      /^https?:\/\/.*\.haygen\.com$/,
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, can restrict later
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React app (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import tasksRoutes from './routes/tasks.routes';
import importExportRoutes from './routes/import-export.routes';
import fieldsRoutes from './routes/fields.routes';
import resultsRoutes from './routes/results.routes';
import filesRoutes from './routes/files.routes';
import promptsRoutes from './routes/prompts.routes';
import taskListsRoutes from './routes/task-lists.routes';
import tableColumnsRoutes from './routes/table-columns.routes';
import publicationsRoutes from './routes/publications.routes';
import platformsRoutes from './routes/platforms.routes';
import imagesRoutes from './routes/images.routes';
import trainingTopicsRoutes from './routes/training-topics.routes';
import trainingRolesRoutes from './routes/training-roles.routes';
import trainingAssetsRoutes from './routes/training-assets.routes';
import trainingTestsRoutes from './routes/training-tests.routes';
import galleryRoutes from './routes/gallery.routes';
import stockMediaRoutes from './routes/stock-media.routes';
import speechRoutes from './routes/speech.routes';
import voicesRoutes from './routes/voices.routes';

app.use('/api/task-lists', taskListsRoutes);
app.use('/api/table-columns', tableColumnsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/tasks', importExportRoutes);
app.use('/api/tasks/:id/fields', fieldsRoutes);
app.use('/api/tasks/:id/results', resultsRoutes);
app.use('/api/tasks/:id/publications', publicationsRoutes);
app.use('/api/tasks/:taskId/publications/:publicationId', imagesRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/training-topics', trainingTopicsRoutes);
app.use('/api/training-roles', trainingRolesRoutes);
app.use('/api/training-topics/:topicId/assets', trainingAssetsRoutes);
app.use('/api/training-topics/:topicId/test', trainingTestsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/stock-media', stockMediaRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/voices', voicesRoutes);

// Serve React app for all non-API routes (in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res, next) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });
} else {
  // 404 handler for undefined routes (development)
  app.use((req, res) => {
    res.status(404).json({ 
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: {
        root: 'GET /',
        health: 'GET /health',
        tasks: 'GET /api/tasks',
        files: 'POST /api/files/upload',
        prompts: 'GET /api/prompts/:taskId',
      }
    });
  });
}

// Error handling middleware
import { errorHandler } from './middleware/error-handler';
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

