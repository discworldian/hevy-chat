import { Router, type Request, type Response } from 'express';
import * as cache from '../cache.js';
import { computeMuscleVolumeForRange, MUSCLE_GROUP_AXES } from '../analysis/muscleVolume.js';
import { getCurrentCycle, getCycleById, getWorkoutsInRange } from '../analysis/cycleManager.js';
import { computeEstimated1RM, checkPersonalRecord } from '../analysis/progression.js';
import { getAnimalComparison } from '../analysis/animalComparison.js';
import { SCIENCE_TIDBITS } from '../analysis/motivationalNudges.js';
import type { Workout } from '../hevyTypes.js';

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

router.get('/exercise/:templateId/cycle-progress', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const cycleId = req.query.cycleId as string | undefined;

    const workoutsCache = await cache.readWorkouts();

    // Resolve cycle
    let cycle;
    if (cycleId) {
      cycle = await getCycleById(cycleId);
      if (!cycle) {
        return res.status(404).json({ error: 'Cycle not found' });
      }
    } else {
      cycle = await getCurrentCycle();
      if (!cycle) {
        return res.status(404).json({ error: 'No active cycle' });
      }
    }

    // Get cycle date range
    const startDate = new Date(cycle.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 56); // 8 weeks
    if (cycle.endDate) {
      endDate.setTime(new Date(cycle.endDate).getTime());
    }

    const cycleWorkouts = getWorkoutsInRange(workoutsCache.workouts, cycle.startDate, endDate.toISOString().split('T')[0]);

    // Find all sessions containing this exercise
    interface SessionData {
      date: string;
      workoutId: string;
      sets: any[];
    }
    const sessions: SessionData[] = [];

    for (const workout of cycleWorkouts) {
      const exerciseData = workout.exercises.find((e) => e.exercise_template_id === templateId);
      if (exerciseData) {
        // Extract working sets (no warmups)
        const workingSets = exerciseData.sets.filter((s: any) => s.type === 'normal' || s.type === 'dropset');
        if (workingSets.length > 0) {
          sessions.push({
            date: workout.start_time.split('T')[0],
            workoutId: workout.id,
            sets: workingSets,
          });
        }
      }
    }

    // Sort chronologically
    sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute per-session metrics
    const result = sessions.map((session, sessionIdx) => {
      // Estimated 1RM and best-set volume
      let estimated1RM = 0;
      let bestSetVolume = 0;

      for (const set of session.sets) {
        if (set.weight_kg && set.reps) {
          const e1rm = computeEstimated1RM(set.weight_kg, set.reps);
          const volume = set.weight_kg * set.reps;
          estimated1RM = Math.max(estimated1RM, e1rm);
          bestSetVolume = Math.max(bestSetVolume, volume);
        }
      }

      // Per-set rep classification (compare to previous session same set index)
      const setClassifications = session.sets.map((set, setIdx) => {
        const prevSession = sessionIdx > 0 ? sessions[sessionIdx - 1] : null;
        const prevSet = prevSession ? prevSession.sets[setIdx] : null;
        const targetReps = prevSet ? prevSet.reps : set.reps;

        let classification: 'hit' | 'exceeded' | 'missed' = 'hit';
        if (prevSet) {
          if (set.reps > prevSet.reps) {
            classification = 'exceeded';
          } else if (set.reps < prevSet.reps) {
            classification = 'missed';
          }
        }

        return {
          reps: set.reps || 0,
          targetReps: targetReps || 0,
          weight: set.weight_kg || 0,
          classification,
        };
      });

      return {
        date: session.date,
        estimated1RM: Math.round(estimated1RM * 10) / 10,
        bestSetVolume,
        sets: setClassifications,
      };
    });

    res.json({ sessions: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.get('/cycle-report', async (req: Request, res: Response) => {
  try {
    const cycleId = req.query.cycleId as string | undefined;

    const workoutsCache = await cache.readWorkouts();
    const templatesCache = await cache.readTemplates();

    // Resolve cycle
    let cycle;
    if (cycleId) {
      cycle = await getCycleById(cycleId);
      if (!cycle) {
        return res.status(404).json({ error: 'Cycle not found' });
      }
    } else {
      cycle = await getCurrentCycle();
      if (!cycle) {
        return res.status(404).json({ error: 'No active cycle' });
      }
    }

    // Get cycle date range
    const startDate = new Date(cycle.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 56); // 8 weeks
    if (cycle.endDate) {
      endDate.setTime(new Date(cycle.endDate).getTime());
    }

    const cycleWorkouts = getWorkoutsInRange(workoutsCache.workouts, cycle.startDate, endDate.toISOString().split('T')[0]);

    // 9a. Compound Summary
    const compoundSummary = [];
    for (const splitDay of ['push' as const, 'pull' as const, 'legs' as const]) {
      for (const templateId of cycle.compoundExercises[splitDay]) {
        const template = templatesCache.templates.find((t) => t.id === templateId);
        if (!template) continue;

        const sessions = [];
        for (const workout of cycleWorkouts) {
          const ex = workout.exercises.find((e) => e.exercise_template_id === templateId);
          if (ex) {
            const workingSets = ex.sets.filter((s: any) => s.type === 'normal' || s.type === 'dropset');
            if (workingSets.length > 0) {
              let maxWeight = 0;
              let maxE1rm = 0;
              for (const set of workingSets) {
                if (set.weight_kg && set.reps) {
                  maxWeight = Math.max(maxWeight, set.weight_kg);
                  const e1rm = computeEstimated1RM(set.weight_kg, set.reps);
                  maxE1rm = Math.max(maxE1rm, e1rm);
                }
              }
              sessions.push({ date: workout.start_time.split('T')[0], weight: maxWeight, e1rm: maxE1rm });
            }
          }
        }

        if (sessions.length > 0) {
          sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const startWeight = sessions[0].weight;
          const startE1rm = sessions[0].e1rm;
          const endWeight = sessions[sessions.length - 1].weight;
          const endE1rm = sessions[sessions.length - 1].e1rm;
          const pctChange = startWeight > 0 ? ((endWeight - startWeight) / startWeight) * 100 : 0;

          compoundSummary.push({
            templateId,
            title: template.title,
            startWeightKg: startWeight,
            endWeightKg: endWeight,
            startE1RM: Math.round(startE1rm * 10) / 10,
            endE1RM: Math.round(endE1rm * 10) / 10,
            percentChange: Math.round(pctChange * 10) / 10,
          });
        }
      }
    }

    // 9b. Muscle Volume Radar (weeks 1-2 vs 7-8)
    const week1End = new Date(startDate);
    week1End.setDate(week1End.getDate() + 13);
    const week1Volume = computeMuscleVolumeForRange(cycleWorkouts, templatesCache.templates, startDate, week1End);

    const week7Start = new Date(startDate);
    week7Start.setDate(week7Start.getDate() + 42); // Start of week 7
    const week8End = new Date(week7Start);
    week8End.setDate(week8End.getDate() + 13); // End of week 8

    const week7Volume = computeMuscleVolumeForRange(cycleWorkouts, templatesCache.templates, week7Start, week8End);

    const muscleRadarData = MUSCLE_GROUP_AXES.map((muscle) => ({
      muscle,
      cycleStart: week1Volume[muscle] || 0,
      cycleEnd: week7Volume[muscle] || 0,
    }));

    // 9c. Consistency Score
    const sessionsPlanned = 24;
    const sessionsCompleted = new Set(cycleWorkouts.map((w) => w.start_time.split('T')[0])).size;
    const consistencyPercent = Math.round((sessionsCompleted / sessionsPlanned) * 100);

    // Calculate streak (longest run of weeks with 3+ sessions)
    const weekSessions: Record<number, number> = {};
    for (const workout of cycleWorkouts) {
      const workoutDate = new Date(workout.start_time);
      const weekNum = Math.floor((workoutDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      weekSessions[weekNum] = (weekSessions[weekNum] || 0) + 1;
    }

    let longestStreak = 0;
    let currentStreak = 0;
    for (let week = 1; week <= 8; week++) {
      if ((weekSessions[week] || 0) >= 3) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // 9d. Motivational Summary
    const totalVolume = cycleWorkouts.reduce((sum, w) => {
      return sum + w.exercises.reduce((exSum, ex) => {
        return exSum + ex.sets.reduce((setSum: any, set: any) => {
          if (set.type !== 'warmup' && set.weight_kg && set.reps) {
            return setSum + set.weight_kg * set.reps;
          }
          return setSum;
        }, 0);
      }, 0);
    }, 0);

    // Best PR exercise (largest % improvement in e1RM)
    let bestPRExercise = '';
    let bestPRPct = 0;
    for (const compound of compoundSummary) {
      const improvement = ((compound.endE1RM - compound.startE1RM) / compound.startE1RM) * 100;
      if (improvement > bestPRPct) {
        bestPRPct = improvement;
        bestPRExercise = compound.title;
      }
    }

    const animal = getAnimalComparison(totalVolume);
    const animalComparison = animal
      ? `Your cycle volume is roughly ${Math.round(totalVolume / animal.weight)}x an adult ${animal.name}.`
      : `You lifted ${Math.round(totalVolume)}kg this cycle.`;

    const scienceTidbit = SCIENCE_TIDBITS[Math.floor(Math.random() * SCIENCE_TIDBITS.length)];

    res.json({
      cycleId: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate || new Date().toISOString().split('T')[0],
      compoundSummary,
      muscleRadarData,
      consistency: {
        sessionsComplanned: sessionsPlanned,
        sessionsCompleted,
        percentComplete: consistencyPercent,
        longestStreak,
      },
      motivationalSummary: {
        totalVolumeKg: Math.round(totalVolume),
        bestPRExercise,
        bestPRPercent: Math.round(bestPRPct * 10) / 10,
        animalComparison,
        scienceTidbit,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
