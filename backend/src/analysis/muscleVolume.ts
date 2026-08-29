import type { Workout, ExerciseTemplate } from '../hevyTypes.js';

// Organized by body region for radar chart visualization
export const MUSCLE_GROUP_AXES = [
  // Upper body (8 muscles, ~53% of circle)
  'chest',
  'shoulders',
  'triceps',
  'lats',
  'upper_back',
  'traps',
  'biceps',
  'forearms',
  // Lower body (5 muscles, ~33% of circle)
  'quadriceps',
  'glutes',
  'hamstrings',
  'calves',
  'lower_back',
  // Core (1 muscle, ~7% of circle)
  'abdominals',
  // Accessory (1 muscle, ~7% of circle)
  'adductors',
];

export const MUSCLE_REGIONS = {
  upper: ['chest', 'shoulders', 'triceps', 'lats', 'upper_back', 'traps', 'biceps', 'forearms'],
  lower: ['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back'],
  core: ['abdominals', 'adductors'],
};

export function computeMuscleVolumeForRange(
  workouts: Workout[],
  templates: ExerciseTemplate[],
  startDate: Date,
  endDate: Date,
): Record<string, number> {
  const volume: Record<string, number> = {};

  // Initialize all muscle groups to 0
  for (const muscle of MUSCLE_GROUP_AXES) {
    volume[muscle] = 0;
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  for (const workout of workouts) {
    const workoutTime = new Date(workout.start_time).getTime();
    if (workoutTime < startMs || workoutTime > endMs) continue;

    for (const exercise of workout.exercises) {
      const template = templates.find((t) => t.id === exercise.exercise_template_id);
      if (!template) continue;

      // Sum volume (weight × reps) for non-warmup sets
      const exerciseVolume = exercise.sets.reduce((sum, set) => {
        if ((set.type === 'normal' || set.type === 'dropset') && set.weight_kg && set.reps) {
          return sum + set.weight_kg * set.reps;
        }
        return sum;
      }, 0);

      if (exerciseVolume === 0) continue;

      // Attribute 100% to primary muscle
      if (template.primary_muscle_group) {
        volume[template.primary_muscle_group] = (volume[template.primary_muscle_group] || 0) + exerciseVolume;
      }

      // Attribute 50% to each secondary muscle
      if (template.secondary_muscle_groups) {
        for (const secondaryMuscle of template.secondary_muscle_groups) {
          volume[secondaryMuscle] = (volume[secondaryMuscle] || 0) + exerciseVolume * 0.5;
        }
      }
    }
  }

  return volume;
}
