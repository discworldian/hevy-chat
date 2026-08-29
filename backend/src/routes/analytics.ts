import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';
import { computeMuscleVolumeForRange, MUSCLE_GROUP_AXES } from '../analysis/muscleVolume.js';

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

router.get('/muscle-volume-weekly', async (req: Request, res: Response) => {
  try {
    const weeksBack = Math.max(1, parseInt(req.query.weeksBack as string) || 2);
    const workoutsCache = await cache.readWorkouts();
    const templatesCache = await cache.readTemplates();

    const weeks = [];
    const now = new Date();

    // Generate last weeksBack weeks (7-day windows ending today)
    for (let i = weeksBack - 1; i >= 0; i--) {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - i * 7);
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const muscleVolume = computeMuscleVolumeForRange(workoutsCache.workouts, templatesCache.templates, startDate, endDate);

      const weekLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeks.push({ weekLabel, muscleVolume });
    }

    res.json({ weeks });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
