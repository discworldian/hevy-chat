import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';
import { analyzeExercise } from '../analysis/exerciseAnalysis.js';
import { buildEightWeekPlan } from '../analysis/planBuilder.js';
import type { Location } from '../equipment/equipmentTypes.js';
import { canExerciseBePerformed } from '../equipment/exerciseEquipmentMap.js';
import type { ExercisePlan } from '../analysis/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const location = (req.query.location as string) || 'home';

    const workoutsCache = await cache.readWorkouts();
    const templatesCache = await cache.readTemplates();

    // Collect unique exercises from all workouts
    const exerciseIds = new Set<string>();
    for (const workout of workoutsCache.workouts) {
      for (const exercise of workout.exercises) {
        exerciseIds.add(exercise.exercise_template_id);
      }
    }

    const plans: ExercisePlan[] = [];

    for (const exerciseId of exerciseIds) {
      const template = templatesCache.templates.find((t) => t.id === exerciseId);
      if (!template) continue;

      // Check equipment availability
      const equipment = await canExerciseBePerformed(template, location as Location);
      if (!equipment.available) {
        plans.push({
          exerciseTemplateId: exerciseId,
          title: template.title,
          status: 'unavailable' as any,
          missingEquipment: equipment.missingEquipment,
        });
        continue;
      }

      const analysis = await analyzeExercise(
        exerciseId,
        workoutsCache.workouts,
        template.title,
        workoutsCache.workouts,
      );

      if (analysis.status !== 'ok' || !analysis.suggestion) {
        plans.push({
          exerciseTemplateId: analysis.exerciseTemplateId,
          title: analysis.title,
          status: analysis.status,
          sessionsCount: analysis.sessionsCount,
        });
        continue;
      }

      // Build 8-week plan
      const repRangeLow = 8;
      const repRangeHigh = 12;

      const exerciseWorkouts = workoutsCache.workouts.filter((w) =>
        w.exercises.some((e) => e.exercise_template_id === exerciseId),
      );

      if (exerciseWorkouts.length === 0) {
        plans.push({
          exerciseTemplateId: exerciseId,
          title: template.title,
          status: 'insufficient_data',
        });
        continue;
      }

      const lastWorkout = exerciseWorkouts[exerciseWorkouts.length - 1];
      const exerciseData = lastWorkout.exercises.find((e) => e.exercise_template_id === exerciseId)!;
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
        const ex = w.exercises.find((e) => e.exercise_template_id === exerciseId);
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
        exerciseTemplateId: exerciseId,
        repRangeLow,
        repRangeHigh,
        currentWeightKg: maxWeight,
        currentTargetReps: repRangeLow,
        consecutiveMisses: 0,
        consecutiveSameWeightSessions: consecutiveSameWeight,
      };

      const weeks = buildEightWeekPlan(currentState, analysis.suggestion, template);

      plans.push({
        exerciseTemplateId: exerciseId,
        title: template.title,
        status: 'ok',
        sessionsCount: analysis.sessionsCount,
        weeks,
      });
    }

    res.json({ location, exercisePlans: plans });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
