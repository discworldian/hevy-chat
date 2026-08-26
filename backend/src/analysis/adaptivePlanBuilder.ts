import type { Workout } from '../hevyTypes.js';
import type { ExerciseProgressionState, PlanWeek, Suggestion } from './types.js';
import { computeProgression } from './progression.js';
import { buildEightWeekPlan } from './planBuilder.js';
import { setAnchor, getAnchor } from './planAnchors.js';
import type { ExerciseTemplate } from '../hevyTypes.js';

interface SessionData {
  date: string;
  sets: any[];
}

/**
 * Builds an adaptive 8-week plan.
 * - For weeks that have elapsed since the plan anchor date, replay real logged sessions (actual: true).
 * - For future weeks, project forward from the current state (actual: false).
 */
export async function buildAdaptiveEightWeekPlan(
  exerciseTemplateId: string,
  workouts: Workout[],
  currentState: ExerciseProgressionState,
  currentSuggestion: Suggestion,
  exercise: ExerciseTemplate | null,
): Promise<PlanWeek[]> {
  // Get or create the plan anchor
  let anchorDate = await getAnchor(exerciseTemplateId);
  if (!anchorDate) {
    // First time — anchor to today
    const now = new Date().toISOString().split('T')[0];
    await setAnchor(exerciseTemplateId, now);
    anchorDate = now;
  }

  const anchorTime = new Date(anchorDate + 'T00:00:00Z').getTime();
  const now = new Date().getTime();
  const elapsedWeeks = Math.min(Math.floor((now - anchorTime) / (7 * 24 * 60 * 60 * 1000)), 8);

  const weeks: PlanWeek[] = [];

  // Collect sessions for this exercise, grouped by week
  const sessionsByWeek: Record<number, SessionData[]> = {};
  for (let week = 1; week <= 8; week++) {
    sessionsByWeek[week] = [];
  }

  for (const workout of workouts) {
    const exercise = workout.exercises.find((e) => e.exercise_template_id === exerciseTemplateId);
    if (!exercise) continue;

    const workoutTime = new Date(workout.start_time).getTime();
    const weeksSinceAnchor = Math.floor((workoutTime - anchorTime) / (7 * 24 * 60 * 60 * 1000));
    const week = Math.min(Math.max(weeksSinceAnchor + 1, 1), 8);

    const nonWarmupSets = exercise.sets.filter((s) => s.type !== 'warmup');
    if (nonWarmupSets.length > 0) {
      sessionsByWeek[week].push({
        date: workout.start_time,
        sets: nonWarmupSets,
      });
    }
  }

  // Sort sessions within each week by date
  for (const week in sessionsByWeek) {
    sessionsByWeek[week].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  let runningState = { ...currentState };

  // Weeks 1..elapsedWeeks: replay actual data
  for (let week = 1; week <= elapsedWeeks; week++) {
    const sessionsInWeek = sessionsByWeek[week];

    if (sessionsInWeek.length > 0) {
      // Use the last session from this week to determine state
      const lastSessionInWeek = sessionsInWeek[sessionsInWeek.length - 1];

      // Get max weight and reps
      let maxWeightKg = 0;
      let maxReps = 0;
      for (const set of lastSessionInWeek.sets) {
        if ((set.weight_kg ?? 0) > maxWeightKg) {
          maxWeightKg = set.weight_kg ?? 0;
        }
        if ((set.reps ?? 0) > maxReps) {
          maxReps = set.reps ?? 0;
        }
      }

      weeks.push({
        week,
        targetSets: 3,
        targetRepsLow: runningState.repRangeLow,
        targetRepsHigh: runningState.repRangeHigh,
        targetReps: runningState.currentTargetReps,
        weightKg: runningState.currentWeightKg,
        actual: true,
        loggedWeightKg: maxWeightKg,
        loggedReps: maxReps,
      });

      // Re-compute the suggestion for this week's data to update the running state
      const allPriorSessions = workouts
        .filter((w) => {
          const t = new Date(w.start_time).getTime();
          return t <= new Date(lastSessionInWeek.date).getTime();
        })
        .flatMap((w) => {
          const ex = w.exercises.find((e) => e.exercise_template_id === exerciseTemplateId);
          if (!ex) return [];
          const nonWarmup = ex.sets.filter((s) => s.type !== 'warmup');
          return nonWarmup.length > 0 ? [{ date: w.start_time, sets: nonWarmup }] : [];
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (allPriorSessions.length > 0) {
        const suggestion = computeProgression(allPriorSessions, runningState, exercise);
        runningState.currentWeightKg = suggestion.nextWeightKg;
        runningState.currentTargetReps = suggestion.nextTargetReps;
        runningState.consecutiveMisses = 0;
      }
    } else {
      // No session logged this week — use the previously projected week
      weeks.push({
        week,
        targetSets: 3,
        targetRepsLow: runningState.repRangeLow,
        targetRepsHigh: runningState.repRangeHigh,
        targetReps: runningState.currentTargetReps,
        weightKg: runningState.currentWeightKg,
        actual: false,
      });
    }
  }

  // Weeks (elapsedWeeks + 1)..8: project forward from current state
  for (let week = elapsedWeeks + 1; week <= 8; week++) {
    const simulatedSession = {
      date: new Date().toISOString(),
      sets: [
        {
          index: 0,
          type: 'normal' as const,
          weight_kg: runningState.currentWeightKg,
          reps: runningState.currentTargetReps,
          distance_meters: null,
          duration_seconds: null,
          rpe: 8,
          custom_metric: null,
        },
      ],
    };

    const nextSuggestion = computeProgression([simulatedSession], runningState, exercise);

    // Special handling for week 8: structural deload
    if (week === 8) {
      const deloadReps = Math.max(runningState.currentTargetReps - 2, runningState.repRangeLow);
      weeks.push({
        week,
        targetSets: 3,
        targetRepsLow: runningState.repRangeLow,
        targetRepsHigh: runningState.repRangeHigh,
        targetReps: deloadReps,
        weightKg: runningState.currentWeightKg * 0.85,
        actual: false,
      });
    } else {
      weeks.push({
        week,
        targetSets: 3,
        targetRepsLow: nextSuggestion.nextRepRangeLow,
        targetRepsHigh: nextSuggestion.nextRepRangeHigh,
        targetReps: nextSuggestion.nextTargetReps,
        weightKg: nextSuggestion.nextWeightKg,
        actual: false,
      });

      // Update state for next iteration
      runningState.currentWeightKg = nextSuggestion.nextWeightKg;
      runningState.currentTargetReps = nextSuggestion.nextTargetReps;
      runningState.consecutiveMisses = 0;
    }
  }

  return weeks;
}
