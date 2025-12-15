import { Router } from 'express';
import { generatePrompt, generatePromptForPublication, generatePromptFromSettings } from '../services/prompt-generator';
import { asyncHandler } from '../utils/async-handler';
import { promptSettingsSchema } from '../types/prompt-settings';

const router = Router();

router.get('/tasks/:taskId/generate', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const promptData = await generatePrompt(taskId);
  res.json(promptData);
}));

router.post('/tasks/:taskId/publications/:publicationId/generate', asyncHandler(async (req, res) => {
  const { taskId, publicationId } = req.params;
  
  // Parse and validate settings (optional)
  let settings;
  if (req.body.settings) {
    settings = promptSettingsSchema.parse(req.body.settings);
  }
  
  const promptData = await generatePromptForPublication(taskId, publicationId, settings);
  res.json(promptData);
}));

// Keep GET endpoint for backward compatibility (without settings)
router.get('/tasks/:taskId/publications/:publicationId/generate', asyncHandler(async (req, res) => {
  const { taskId, publicationId } = req.params;
  const promptData = await generatePromptForPublication(taskId, publicationId);
  res.json(promptData);
}));

// Generate prompt from settings only (standalone, without task/publication)
router.post('/generate-from-settings', asyncHandler(async (req, res) => {
  const contentType = req.body.contentType || 'video';
  
  // Parse and validate settings (optional)
  let settings;
  if (req.body.settings) {
    settings = promptSettingsSchema.parse(req.body.settings);
  }
  
  const promptData = await generatePromptFromSettings(contentType, settings);
  res.json(promptData);
}));

export default router;

