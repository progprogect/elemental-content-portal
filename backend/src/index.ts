import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
import fieldsRoutes from './routes/fields.routes';
import resultsRoutes from './routes/results.routes';
import filesRoutes from './routes/files.routes';
import promptsRoutes from './routes/prompts.routes';
import taskListsRoutes from './routes/task-lists.routes';
import fieldTemplatesRoutes from './routes/field-templates.routes';

app.use('/api/task-lists', taskListsRoutes);
app.use('/api/field-templates', fieldTemplatesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/tasks/:id/fields', fieldsRoutes);
app.use('/api/tasks/:id/results', resultsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/prompts', promptsRoutes);

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

