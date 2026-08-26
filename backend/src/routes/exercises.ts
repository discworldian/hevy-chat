import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';
import { analyzeExercise } from '../analysis/exerciseAnalysis.js';
import { buildAdaptiveEightWeekPlan } from '../analysis/adaptivePlanBuilder.js';
import { clearAnchor } from '../analysis/planAnchors.js';
import type { Location } from '../equipment/equipmentTypes.js';
import { canExerciseBePerformed } from '../equipment/exerciseEquipmentMap.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const templatesCache = await cache.readTemplates();
    const exercises = templatesCache.templates.map((t) => ({
      templateId: t.id,
      name: t.title,
      category: t.category,
      primaryMuscleGroup: t.primary_muscle_group,
    }));
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read exercises', retryable: true });
  }
});

router.get('/:templateId/analysis', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const location = (req.query.location as string) || 'home';

    const workoutsCache = await cache.readWorkouts();
    const templatesCache = await cache.readTemplates();

    const template = templatesCache.templates.find((t) => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: 'Exercise template not found' });
    }

    // Check equipment availability
    const equipment = await canExerciseBePerformed(template, location as Location);
    if (!equipment.available) {
      return res.json({
        status: 'unavailable',
        title: template.title,
        missingEquipment: equipment.missingEquipment,
        location,
      });
    }

    const analysis = await analyzeExercise(
      templateId,
      workoutsCache.workouts,
      template.title,
      workoutsCache.workouts,
    );

    if (analysis.status === 'ok' && analysis.suggestion) {
      // For plan generation, need the full state and current state
      res.json(analysis);
    } else {
      res.json(analysis);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.get('/:templateId/plan', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const location = (req.query.location as string) || 'home';

    const workoutsCache = await cache.readWorkouts();
    const templatesCache = await cache.readTemplates();

    const template = templatesCache.templates.find((t) => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: 'Exercise template not found' });
    }

    // Check equipment availability
    const equipment = await canExerciseBePerformed(template, location as Location);
    if (!equipment.available) {
      return res.json({
        status: 'unavailable',
        title: template.title,
        missingEquipment: equipment.missingEquipment,
        location,
      });
    }

    const analysis = await analyzeExercise(
      templateId,
      workoutsCache.workouts,
      template.title,
      workoutsCache.workouts,
    );

    if (analysis.status !== 'ok' || !analysis.suggestion) {
      return res.json(analysis);
    }

    // Build 8-week plan
    const repRangeLow = 8;
    const repRangeHigh = 12;

    // Find latest session weight
    const exerciseWorkouts = workoutsCache.workouts.filter((w) =>
      w.exercises.some((e) => e.exercise_template_id === templateId),
    );

    if (exerciseWorkouts.length === 0) {
      return res.json({
        status: 'insufficient_data',
        title: template.title,
      });
    }

    const lastWorkout = exerciseWorkouts[exerciseWorkouts.length - 1];
    const exerciseData = lastWorkout.exercises.find((e) => e.exercise_template_id === templateId)!;
    const nonWarmupSets = exerciseData.sets.filter((s) => s.type !== 'warmup');

    let maxWeight = 0;
    for (const set of nonWarmupSets) {
      if ((set.weight_kg ?? 0) > maxWeight) {
        maxWeight = set.weight_kg ?? 0;
      }
    }

    // Compute consecutive same weight sessions
    let consecutiveSameWeight = 0;
    for (let i = exerciseWorkouts.length - 1; i >= 0; i--) {
      const w = exerciseWorkouts[i];
      const ex = w.exercises.find((e) => e.exercise_template_id === templateId);
      if (!ex) continue;
      const nonWarmup = ex.sets.filter((s) => s.type !== 'warmup');
      const wMaxWeight = Math.max(...nonWarmup.map((s) => s.weight_kg ?? 0));
      if (wMaxWeight === maxWeight) {
        consecutiveSameWeight++;
      } else {
        break;
      }
    }

    const currentState = {
      exerciseTemplateId: templateId,
      repRangeLow,
      repRangeHigh,
      currentWeightKg: maxWeight,
      currentTargetReps: repRangeLow,
      consecutiveMisses: 0,
      consecutiveSameWeightSessions: consecutiveSameWeight,
    };

    const weeks = await buildAdaptiveEightWeekPlan(
      templateId,
      workoutsCache.workouts,
      currentState,
      analysis.suggestion,
      template,
    );

    res.json({
      status: 'ok',
      title: template.title,
      weeks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.post('/:templateId/plan/restart', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    // Clear the anchor for this exercise
    await clearAnchor(templateId);

    res.json({ success: true, message: 'Plan restarted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
