import { Router, type Request, type Response } from 'express';
import type { Location } from '../equipment/equipmentTypes.js';
import { buildDraftWorkout, type DraftWorkoutExercise } from '../analysis/draftWorkoutBuilder.js';
import * as pushService from '../push/draftPushService.js';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { minutesAvailable, location, includeCardio, includeWarmupCooldown } = req.body;

    if (typeof minutesAvailable !== 'number' || minutesAvailable <= 0) {
      return res.status(400).json({ error: 'minutesAvailable must be a positive number' });
    }

    if (location !== 'home' && location !== 'gym') {
      return res.status(400).json({ error: 'location must be "home" or "gym"' });
    }

    const result = await buildDraftWorkout(minutesAvailable, location as Location, includeCardio === true, includeWarmupCooldown === true);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.post('/push/preview', async (req: Request, res: Response) => {
  try {
    const { title, exercises, includeWarmup, includeWarmupCooldown } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required and must be non-empty' });
    }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({ error: 'exercises must be an array' });
    }

    const result = pushService.preview(title, exercises as DraftWorkoutExercise[], includeWarmup === true, includeWarmupCooldown === true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.post('/push/confirm', async (req: Request, res: Response) => {
  try {
    const { title, exercises, previewToken, includeWarmup, includeWarmupCooldown } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required and must be non-empty' });
    }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({ error: 'exercises must be an array' });
    }

    if (typeof previewToken !== 'string') {
      return res.status(400).json({ error: 'previewToken is required' });
    }

    const result = await pushService.confirmPush(title, exercises as DraftWorkoutExercise[], previewToken, includeWarmup === true, includeWarmupCooldown === true);
    res.json(result);
  } catch (err: any) {
    if (err.message.includes('not found') || err.message.includes('expired')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes('modified')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
