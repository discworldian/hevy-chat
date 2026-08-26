import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const workoutsCache = await cache.readWorkouts();

    // Stub: basic metrics
    const totalWorkouts = workoutsCache.workouts.length;
    const totalSets = workoutsCache.workouts.reduce(
      (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
      0,
    );

    res.json({
      totalWorkouts,
      totalSets,
      hasMeasurements: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.get('/exercise/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const workoutsCache = await cache.readWorkouts();

    const exerciseWorkouts = workoutsCache.workouts.filter((w) =>
      w.exercises.some((e) => e.exercise_template_id === templateId),
    );

    res.json({
      templateId,
      sessionsCount: exerciseWorkouts.length,
      // Stub: full metrics would go here
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});


export default router;
