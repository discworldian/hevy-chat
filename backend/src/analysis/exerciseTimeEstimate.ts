import type { ExerciseTemplate } from '../hevyTypes.js';
import { isCompoundExercise } from './incrementTable.js';

// Documented heuristic constants for time budgeting
export const EXERCISE_SETUP_OVERHEAD_SECONDS = 60; // moving to new station, loading plates, etc.
export const SECONDS_PER_SET = {
  compound: 180, // ~3 min: heavier load, longer rest
  isolation: 120, // ~2 min: lighter load, shorter rest
  dropset: 60, // ~1 min: no rest between drops, quick weight reduction
};

export function estimateExerciseSeconds(template: ExerciseTemplate, sets: number): number {
  const perSetSeconds = isCompoundExercise(template) ? SECONDS_PER_SET.compound : SECONDS_PER_SET.isolation;
  return EXERCISE_SETUP_OVERHEAD_SECONDS + sets * perSetSeconds;
}

export function estimateDropSetExerciseSeconds(dropSets: number): number {
  // Drop set: 1 working set + N drop sets, all without rest
  // Setup once, then rapid fire drops
  return EXERCISE_SETUP_OVERHEAD_SECONDS + dropSets * SECONDS_PER_SET.dropset;
}

export function estimateExerciseWithWarmup(template: ExerciseTemplate, sets: number, includeWarmup: boolean): number {
  // Time for main exercise plus optional warm-up set
  const mainTime = estimateExerciseSeconds(template, sets);
  if (!includeWarmup) return mainTime;
  // Warm-up set uses isolation pace (same as accessories)
  return mainTime + SECONDS_PER_SET.isolation;
}
