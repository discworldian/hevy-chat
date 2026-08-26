import type { Workout, WorkoutSet } from '../hevyTypes.js';
import type { AnalysisResult, ExerciseProgressionState } from './types.js';
import { computeProgression } from './progression.js';
import { readTemplates } from '../cache.js';
import { getFrequencyStatus } from './sessionContext.js';
import { readTrainingSettings } from './trainingSettings.js';

interface SessionData {
  date: string;
  sets: WorkoutSet[];
}

export async function analyzeExercise(
  exerciseTemplateId: string,
  workouts: Workout[],
  exerciseTitle: string,
  allWorkoutsForContext?: Workout[],
): Promise<AnalysisResult> {
  // Collect all non-warmup sets for this exercise across all workouts, sorted by date
  const sessions: SessionData[] = [];
  const exerciseRepsCount: Record<string, number[]> = {};

  for (const workout of workouts) {
    const exercise = workout.exercises.find((e) => e.exercise_template_id === exerciseTemplateId);
    if (!exercise) continue;

    const nonWarmupSets = exercise.sets.filter((s) => s.type !== 'warmup');
    if (nonWarmupSets.length === 0) continue;

    sessions.push({
      date: workout.start_time,
      sets: nonWarmupSets,
    });
  }

  sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sessions.length < 2) {
    return {
      exerciseTemplateId,
      title: exerciseTitle,
      status: 'insufficient_data',
      sessionsCount: sessions.length,
    };
  }

  // Check if this is cardio (reps-less, duration/distance-based)
  const lastSession = sessions[sessions.length - 1];
  const hasAnyReps = lastSession.sets.some((s) => s.reps !== null && s.reps > 0);
  const hasAnyDurationOrDistance = lastSession.sets.some(
    (s) => (s.duration_seconds ?? 0) > 0 || (s.distance_meters ?? 0) > 0,
  );

  if (!hasAnyReps && hasAnyDurationOrDistance) {
    return {
      exerciseTemplateId,
      title: exerciseTitle,
      status: 'cardio',
      sessionsCount: sessions.length,
    };
  }

  // Bootstrap current state from the most recent session
  const lastWorkoutSession = sessions[sessions.length - 1];

  // Find max weight in last session
  let maxWeightKg = 0;
  let maxReps = 0;
  for (const set of lastWorkoutSession.sets) {
    if ((set.weight_kg ?? 0) > maxWeightKg) {
      maxWeightKg = set.weight_kg ?? 0;
    }
    if ((set.reps ?? 0) > maxReps) {
      maxReps = set.reps ?? 0;
    }
  }

  // Default rep range
  const repRangeLow = 8;
  const repRangeHigh = 12;

  // Compute consecutive misses from history
  let consecutiveMisses = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const reps = session.sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
    if (reps.length === 0) break;
    const minReps = Math.min(...reps);
    if (minReps < repRangeLow) {
      consecutiveMisses++;
    } else {
      break;
    }
  }

  // Compute consecutive same weight sessions
  let consecutiveSameWeightSessions = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const sessionMaxWeight = Math.max(...session.sets.map((s) => s.weight_kg ?? 0));
    if (sessionMaxWeight === maxWeightKg) {
      consecutiveSameWeightSessions++;
    } else {
      break;
    }
  }

  const currentState: ExerciseProgressionState = {
    exerciseTemplateId,
    repRangeLow,
    repRangeHigh,
    currentWeightKg: maxWeightKg,
    currentTargetReps: repRangeLow, // Bootstrap to bottom of range
    consecutiveMisses,
    consecutiveSameWeightSessions,
  };

  // Look up exercise template for category info
  const templatesCache = await readTemplates();
  const exerciseTemplate = templatesCache.templates.find((t) => t.id === exerciseTemplateId);

  // Check if training below target frequency (conservative hedge)
  let applyConservativeHedge = false;
  if (allWorkoutsForContext && allWorkoutsForContext.length > 0) {
    const trainingSettings = await readTrainingSettings();
    const frequencyStatus = getFrequencyStatus(allWorkoutsForContext, trainingSettings.weeklyFrequencyTarget);
    applyConservativeHedge = frequencyStatus.belowTarget;
  }

  const suggestion = computeProgression(
    sessions,
    currentState,
    exerciseTemplate || null,
    applyConservativeHedge,
  );

  return {
    exerciseTemplateId,
    title: exerciseTitle,
    status: 'ok',
    sessionsCount: sessions.length,
    suggestion,
  };
}
