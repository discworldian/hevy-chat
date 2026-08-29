import { Router, type Request, type Response } from 'express';
import {
  getCurrentCycle,
  startNewCycle,
  getCycleProgress,
  calculateCycleWeekNumber,
  type TrainingCycle,
} from '../analysis/cycleManager.js';

const router = Router();

router.get('/current', async (req: Request, res: Response) => {
  try {
    const cycle = await getCurrentCycle();
    res.json({ cycle });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.get('/progress', async (req: Request, res: Response) => {
  try {
    const progress = await getCycleProgress();
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.post('/start', async (req: Request, res: Response) => {
  try {
    const { compoundExercises } = req.body;

    if (!compoundExercises || typeof compoundExercises !== 'object') {
      return res.status(400).json({ error: 'compoundExercises must be an object with push, pull, legs keys' });
    }

    const { push, pull, legs } = compoundExercises;
    if (!Array.isArray(push) || !Array.isArray(pull) || !Array.isArray(legs)) {
      return res
        .status(400)
        .json({ error: 'Each split day must have an array of exercise template IDs' });
    }

    const newCycle = await startNewCycle({
      push,
      pull,
      legs,
    });

    res.json(newCycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
