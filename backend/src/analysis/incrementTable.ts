import type { ExerciseTemplate } from '../hevyTypes.js';

const COMPOUND_LIFT_PATTERN = /squat|deadlift|press|row|clean|snatch|jerk/i;

interface ExerciseIncrement {
  smallIncrement: number; // kg
  largeIncrement: number; // kg
}

const EXERCISE_CATEGORY_INCREMENTS: Record<string, ExerciseIncrement> = {
  compound: { smallIncrement: 2.5, largeIncrement: 5 },
  isolation: { smallIncrement: 1.25, largeIncrement: 2.5 },
  machine: { smallIncrement: 2.5, largeIncrement: 5 },
  cardio: { smallIncrement: 0, largeIncrement: 0 },
};

export const EXERCISE_INCREMENT_OVERRIDES: Record<string, number> = {
  // Format: "exerciseTemplateId" or "Exercise Name" -> increment in kg
  // Example:
  // "Bench Press": 2.5,
  // "Pull-up": 1.25,
};

export function getIncrementForExercise(
  exercise: ExerciseTemplate | null,
  isCompound: boolean = false,
): number {
  if (!exercise) {
    return isCompound ? 2.5 : 1.25;
  }

  // Check override map first
  if (EXERCISE_INCREMENT_OVERRIDES[exercise.id]) {
    return EXERCISE_INCREMENT_OVERRIDES[exercise.id];
  }

  if (EXERCISE_INCREMENT_OVERRIDES[exercise.title]) {
    return EXERCISE_INCREMENT_OVERRIDES[exercise.title];
  }

  // Check category
  if (exercise.category) {
    const categoryLower = exercise.category.toLowerCase();
    const increment = EXERCISE_CATEGORY_INCREMENTS[categoryLower];
    if (increment) {
      return isCompound ? increment.largeIncrement : increment.smallIncrement;
    }
  }

  // Heuristic: match title against compound lift pattern
  const isCompoundByName = COMPOUND_LIFT_PATTERN.test(exercise.title);
  if (isCompoundByName) {
    return EXERCISE_CATEGORY_INCREMENTS.compound.largeIncrement;
  }

  return EXERCISE_CATEGORY_INCREMENTS.isolation.smallIncrement;
}

export function roundToNearestIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight;
  return Math.round(weight / increment) * increment;
}
