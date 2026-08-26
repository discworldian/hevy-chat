import type { Workout, ExerciseTemplate } from '../hevyTypes.js';

export const DEFAULT_MUSCLE_GROUP_PRIORITY = [
  'quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back',
  'chest', 'back', 'lats', 'upper_back', 'shoulders', 'traps',
  'biceps', 'triceps', 'forearms', 'wrists',
  'core', 'abs', 'obliques',
];

export interface MuscleRecency {
  lastTrainedDate: string | null;
  daysSinceTrained: number;
}

export async function computeMuscleRecency(
  workouts: Workout[],
  templates: ExerciseTemplate[],
): Promise<Record<string, MuscleRecency>> {
  const now = new Date();
  const recency: Record<string, MuscleRecency> = {};

  // Find the most recent date each muscle group was trained
  for (const workout of workouts) {
    const workoutDate = new Date(workout.start_time);

    for (const exercise of workout.exercises) {
      const template = templates.find((t) => t.id === exercise.exercise_template_id);
      if (!template) continue;

      // Track primary muscle group
      if (template.primary_muscle_group) {
        const muscle = template.primary_muscle_group;
        const existing = recency[muscle];

        if (!existing || new Date(workout.start_time) > new Date(existing.lastTrainedDate || 0)) {
          recency[muscle] = {
            lastTrainedDate: workout.start_time,
            daysSinceTrained: 0, // will be updated below
          };
        }
      }

      // Track secondary muscle groups
      if (template.secondary_muscle_groups) {
        for (const muscle of template.secondary_muscle_groups) {
          const existing = recency[muscle];
          if (!existing || new Date(workout.start_time) > new Date(existing.lastTrainedDate || 0)) {
            recency[muscle] = {
              lastTrainedDate: workout.start_time,
              daysSinceTrained: 0, // will be updated below
            };
          }
        }
      }
    }
  }

  // Ensure all known muscle groups appear in the map
  const allMuscleGroups = new Set<string>();
  for (const template of templates) {
    if (template.primary_muscle_group) {
      allMuscleGroups.add(template.primary_muscle_group);
    }
    if (template.secondary_muscle_groups) {
      for (const muscle of template.secondary_muscle_groups) {
        allMuscleGroups.add(muscle);
      }
    }
  }

  // Initialize untrained groups with a sentinel value (very old date)
  for (const muscle of allMuscleGroups) {
    if (!recency[muscle]) {
      recency[muscle] = {
        lastTrainedDate: null,
        daysSinceTrained: Infinity,
      };
    }
  }

  // Calculate days since trained for all groups
  for (const muscle of Object.keys(recency)) {
    const record = recency[muscle];
    if (record.lastTrainedDate) {
      const lastDate = new Date(record.lastTrainedDate);
      record.daysSinceTrained = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return recency;
}

export function rankMuscleGroups(
  recency: Record<string, MuscleRecency>,
): string[] {
  return Object.entries(recency)
    .filter(([muscle]) => muscle !== 'cardio') // exclude cardio from strength workouts
    .sort(([muscleA, recencyA], [muscleB, recencyB]) => {
      // Sort by staleness descending (most stale first)
      const diff = recencyB.daysSinceTrained - recencyA.daysSinceTrained;
      if (diff !== 0) return diff;

      // Tie-break by priority
      const priorityA = DEFAULT_MUSCLE_GROUP_PRIORITY.indexOf(muscleA);
      const priorityB = DEFAULT_MUSCLE_GROUP_PRIORITY.indexOf(muscleB);
      const priorityAIdx = priorityA === -1 ? Infinity : priorityA;
      const priorityBIdx = priorityB === -1 ? Infinity : priorityB;
      return priorityAIdx - priorityBIdx;
    })
    .map(([muscle]) => muscle);
}
