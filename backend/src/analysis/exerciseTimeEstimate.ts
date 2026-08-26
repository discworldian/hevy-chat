import type { ExerciseTemplate } from '../hevyTypes.js';
import { isCompoundExercise } from './incrementTable.js';

// Documented heuristic constants for time budgeting
export const EXERCISE_SETUP_OVERHEAD_SECONDS = 60; // moving to new station, loading plates, etc.
export const SECONDS_PER_SET = {
  compound: 180, // ~3 min: heavier load, longer rest
  isolation: 120, // ~2 min: lighter load, shorter rest
};

export function estimateExerciseSeconds(template: ExerciseTemplate, sets: number): number {
  const perSetSeconds = isCompoundExercise(template) ? SECONDS_PER_SET.compound : SECONDS_PER_SET.isolation;
  return EXERCISE_SETUP_OVERHEAD_SECONDS + sets * perSetSeconds;
}
