import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

app.use('/api/tasks', tasksRoutes);
app.use('/api/tasks/:id/fields', fieldsRoutes);
app.use('/api/tasks/:id/results', resultsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/prompts', promptsRoutes);

// Error handling middleware
import { errorHandler } from './middleware/error-handler';
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

