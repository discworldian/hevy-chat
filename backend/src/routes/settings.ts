import { Router, type Request, type Response } from 'express';
import { readTrainingSettings, writeTrainingSettings } from '../analysis/trainingSettings.js';

const router = Router();

router.get('/training', async (req: Request, res: Response) => {
  try {
    const settings = await readTrainingSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.put('/training', async (req: Request, res: Response) => {
  try {
    const { weeklyFrequencyTarget } = req.body;

    if (typeof weeklyFrequencyTarget !== 'number' || weeklyFrequencyTarget < 1 || weeklyFrequencyTarget > 14) {
      return res.status(400).json({ error: 'weeklyFrequencyTarget must be a number between 1 and 14' });
    }

    await writeTrainingSettings({ weeklyFrequencyTarget });
    res.json({ weeklyFrequencyTarget });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
