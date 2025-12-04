import { Router } from 'express';
import { generatePrompt, generatePromptForPublication } from '../services/prompt-generator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/tasks/:taskId/generate', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const promptData = await generatePrompt(taskId);
  res.json(promptData);
}));

router.get('/tasks/:taskId/publications/:publicationId/generate', asyncHandler(async (req, res) => {
  const { taskId, publicationId } = req.params;
  const promptData = await generatePromptForPublication(taskId, publicationId);
  res.json(promptData);
}));

export default router;

