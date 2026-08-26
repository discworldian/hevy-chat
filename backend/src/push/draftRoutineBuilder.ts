import type { DraftWorkoutExercise } from '../analysis/draftWorkoutBuilder.js';

// The Hevy API expects routine-creation bodies in the shape:
// { routine: { title, folder_id?, notes?, exercises: [{ exercise_template_id, sets: [{ reps, weight_kg?, type }] }] } }
export interface CreateRoutineExerciseSet {
  type: 'normal' | 'warmup';
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

    // Add warm-up set if requested
    if (includeWarmup) {
      const warmupReps = Math.max(5, Math.floor(draftEx.targetReps * 0.5));
      const warmupWeight = draftEx.suggestedWeightKg !== null ? Math.floor(draftEx.suggestedWeightKg * 0.5) : null;
      sets.push({
        type: 'warmup',
        reps: warmupReps,
        ...(warmupWeight !== null && warmupWeight > 0 && { weight_kg: warmupWeight }),
      });
    }

    // Add normal sets
    for (let i = 0; i < draftEx.sets; i++) {
      sets.push({
        type: 'normal',
        reps: draftEx.targetReps,
        ...(draftEx.suggestedWeightKg !== null && draftEx.suggestedWeightKg !== undefined && { weight_kg: draftEx.suggestedWeightKg }),
      });
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
