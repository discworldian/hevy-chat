import type { ExerciseTemplate } from '../types.js';

export function isCardioExercise(exercise: ExerciseTemplate | null | undefined): boolean {
  return exercise?.primaryMuscleGroup === 'cardio';
}
