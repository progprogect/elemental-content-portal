import { Router } from 'express';
import { generatePrompt } from '../services/prompt-generator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/tasks/:taskId/generate', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const promptData = await generatePrompt(taskId);
  res.json(promptData);
}));

export default router;

