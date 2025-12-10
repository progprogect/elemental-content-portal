import { Router } from 'express';
import * as trainingTopicsController from '../controllers/training-topics.controller';
import { generateHeyGenPrompt } from '../services/training-prompt-generator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', asyncHandler(trainingTopicsController.getTopics));
router.get('/:id', asyncHandler(trainingTopicsController.getTopic));
router.get('/:id/heygen-prompt', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promptData = await generateHeyGenPrompt(id);
  res.json(promptData);
}));
router.post('/', asyncHandler(trainingTopicsController.createTopic));
router.put('/:id', asyncHandler(trainingTopicsController.updateTopic));
router.delete('/:id', asyncHandler(trainingTopicsController.deleteTopic));

export default router;

