import type { ExerciseProgressionState, PlanWeek, Suggestion } from './types.js';
import { computeProgression } from './progression.js';
import type { ExerciseTemplate } from '../hevyTypes.js';

/**
 * Simulates progression forward 8 weeks.
 * Assumes prescribed sets/reps/weight are hit each week (optimistic projection).
 * Week 8 includes a structural deload week.
 */
export function buildEightWeekPlan(
  currentState: ExerciseProgressionState,
  currentSuggestion: Suggestion,
  exercise: ExerciseTemplate | null,
): PlanWeek[] {
  const weeks: PlanWeek[] = [];
  let state = { ...currentState };

  // Week 1: use the suggestion derived from the last actual session
  weeks.push({
    week: 1,
    targetSets: 3, // default; could be customized per exercise
    targetRepsLow: currentSuggestion.nextRepRangeLow,
    targetRepsHigh: currentSuggestion.nextRepRangeHigh,
    targetReps: currentSuggestion.nextTargetReps,
    weightKg: currentSuggestion.nextWeightKg,
    actual: false,
  });

  // Update state to reflect week 1
  state.currentWeightKg = currentSuggestion.nextWeightKg;
  state.currentTargetReps = currentSuggestion.nextTargetReps;
  state.consecutiveMisses = 0;
  state.consecutiveSameWeightSessions = 1;

  // Weeks 2-7: simulate success and iterate the progression rule forward
  for (let week = 2; week <= 7; week++) {
    // Simulate a successful session: assume all reps were hit at the target
    const simulatedSession = {
      date: new Date().toISOString(),
      sets: [
        {
          index: 0,
          type: 'normal' as const,
          weight_kg: state.currentWeightKg,
          reps: state.currentTargetReps,
          distance_meters: null,
          duration_seconds: null,
          rpe: 8, // assume RPE 8 (middle of target band)
          custom_metric: null,
        },
      ],
    };

    const nextSuggestion = computeProgression([simulatedSession], state, exercise);

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
    state.currentWeightKg = nextSuggestion.nextWeightKg;
    state.currentTargetReps = nextSuggestion.nextTargetReps;
    state.consecutiveMisses = 0;
    state.consecutiveSameWeightSessions = state.currentWeightKg === nextSuggestion.nextWeightKg ? state.consecutiveSameWeightSessions + 1 : 1;
  }

  // Week 8: structural deload week (reduce volume/reps, same weight or lower)
  const deloadReps = Math.max(state.currentTargetReps - 2, state.repRangeLow);
  weeks.push({
    week: 8,
    targetSets: 3,
    targetRepsLow: state.repRangeLow,
    targetRepsHigh: state.repRangeHigh,
    targetReps: deloadReps,
    weightKg: state.currentWeightKg * 0.85, // Deload at 85% of current
    actual: false,
  });

  return weeks;
}
