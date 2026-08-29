import type { DraftWorkoutExercise } from '../analysis/draftWorkoutBuilder.js';

// The Hevy API expects routine-creation bodies in the shape:
// { routine: { title, folder_id?, notes?, exercises: [{ exercise_template_id, sets: [{ reps, weight_kg?, type }] }] } }
export interface CreateRoutineExerciseSet {
  type: 'normal' | 'warmup' | 'dropset';
  weight_kg?: number | null;
  reps: number;
}

export interface CreateRoutineExercise {
  exercise_template_id: string;
  sets: CreateRoutineExerciseSet[];
}

export interface CreateRoutinePayload {
  routine: {
    title: string;
    notes?: string;
    folder_id?: string | null;
    exercises: CreateRoutineExercise[];
  };
}

export function buildCreateRoutinePayload(
  title: string,
  exercises: DraftWorkoutExercise[],
  folderIdOrNull?: string | null,
  includeWarmup: boolean = true,
  includeWarmupCooldown: boolean = false,
): CreateRoutinePayload {
  const routineExercises: CreateRoutineExercise[] = [];

  // Add warm-up exercise if requested
  if (includeWarmupCooldown) {
    routineExercises.push({
      exercise_template_id: 'warmup-placeholder',
      sets: [
        {
          type: 'normal',
          reps: 10,
          weight_kg: undefined,
        },
      ],
    });
  }

  // Add main exercises
  routineExercises.push(...exercises.map((draftEx) => {
    const sets: CreateRoutineExerciseSet[] = [];

    // Add per-exercise warm-up set if requested
    if (draftEx.includeWarmupSet && draftEx.warmupWeightKg !== null && draftEx.warmupWeightKg !== undefined) {
      sets.push({
        type: 'warmup',
        reps: draftEx.warmupReps || 10,
        weight_kg: draftEx.warmupWeightKg,
      });
    }

    // Add normal sets or drop sets
    if (draftEx.useDropSets) {
      // Drop set: 1 working set + 2 drop sets with reduced weights
      const workingWeight = draftEx.suggestedWeightKg !== null ? draftEx.suggestedWeightKg : undefined;
      const dropWeight1 = workingWeight !== undefined ? Math.round(workingWeight * 0.7) : undefined;
      const dropWeight2 = workingWeight !== undefined ? Math.round(workingWeight * 0.5) : undefined;

      // Working set
      sets.push({
        type: 'normal',
        reps: draftEx.targetReps,
        ...(workingWeight !== undefined && workingWeight > 0 && { weight_kg: workingWeight }),
      });

      // First drop set (70% of working weight)
      sets.push({
        type: 'dropset',
        reps: draftEx.targetReps,
        ...(dropWeight1 !== undefined && dropWeight1 > 0 && { weight_kg: dropWeight1 }),
      });

      // Second drop set (50% of working weight)
      sets.push({
        type: 'dropset',
        reps: draftEx.targetReps,
        ...(dropWeight2 !== undefined && dropWeight2 > 0 && { weight_kg: dropWeight2 }),
      });
    } else {
      // Normal sets
      for (let i = 0; i < draftEx.sets; i++) {
        sets.push({
          type: 'normal',
          reps: draftEx.targetReps,
          ...(draftEx.suggestedWeightKg !== null && draftEx.suggestedWeightKg !== undefined && { weight_kg: draftEx.suggestedWeightKg }),
        });
      }
    }

    return {
      exercise_template_id: draftEx.exerciseTemplateId,
      sets,
    };
  }));

  // Add cool-down exercise if requested
  if (includeWarmupCooldown) {
    routineExercises.push({
      exercise_template_id: 'cooldown-placeholder',
      sets: [
        {
          type: 'normal',
          reps: 1,
          weight_kg: undefined,
        },
      ],
    });
  }

  const payload: CreateRoutinePayload = {
    routine: {
      title,
      exercises: routineExercises,
    },
  };

  // Only add optional fields if they have values
  if (folderIdOrNull) {
    payload.routine.folder_id = folderIdOrNull;
  }

  return payload;
}
