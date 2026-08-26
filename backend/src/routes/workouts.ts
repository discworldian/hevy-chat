import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';
import { analyzeExercise } from '../analysis/exerciseAnalysis.js';
import { getSessionContext, getFrequencyStatus } from '../analysis/sessionContext.js';
import { readTrainingSettings } from '../analysis/trainingSettings.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const cached = await cache.readWorkouts();
    res.json({
      workouts: cached.workouts,
      totalCount: cached.workouts.length,
      lastSyncedAt: cached.lastSyncedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read workouts cache', retryable: true });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const result = await cache.refreshFromHevy();
    res.json(result);
  } catch (err: any) {
    const retryable = err.retryable ?? true;
    const status = err.status ?? 500;
    res.status(status).json({ error: err.message, retryable });
  }
});

router.get('/:workoutId/advice', async (req: Request, res: Response) => {
  try {
    const { workoutId } = req.params;

    const workoutsCache = await cache.readWorkouts();
    const workout = workoutsCache.workouts.find((w) => w.id === workoutId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Get session context
    const sessionContext = getSessionContext(workout, workoutsCache.workouts);

    // Get frequency status
    const trainingSettings = await readTrainingSettings();
    const frequencyStatus = getFrequencyStatus(workoutsCache.workouts, trainingSettings.weeklyFrequencyTarget);

    // Analyze each exercise in this workout (using only sessions up to this workout's date)
    const workoutDateTime = new Date(workout.start_time).getTime();
    const priorWorkouts = workoutsCache.workouts.filter((w) => {
      const wTime = new Date(w.start_time).getTime();
      return wTime <= workoutDateTime;
    });

    const exerciseAdvice = [];

    for (const exercise of workout.exercises) {
      const analysis = await analyzeExercise(
        exercise.exercise_template_id,
        priorWorkouts,
        exercise.title,
        priorWorkouts,
      );

      exerciseAdvice.push({
        exerciseTemplateId: exercise.exercise_template_id,
        title: exercise.title,
        status: analysis.status,
        suggestion: analysis.suggestion,
      });
    }

    res.json({
      workoutId,
      sessionContext,
      frequencyStatus,
      exercises: exerciseAdvice,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
