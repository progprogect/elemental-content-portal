import { Router } from 'express';
import { generatePrompt } from '../services/prompt-generator';

const router = Router();

router.get('/tasks/:taskId/generate', async (req, res) => {
  try {
    const { taskId } = req.params;
    const promptData = await generatePrompt(taskId);
    res.json(promptData);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

export default router;

