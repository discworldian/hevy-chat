import { randomUUID } from 'crypto';
import type { DraftWorkoutExercise } from '../analysis/draftWorkoutBuilder.js';
import type { CreateRoutinePayload } from './draftRoutineBuilder.js';
import { buildCreateRoutinePayload } from './draftRoutineBuilder.js';
import * as hevyClient from '../hevyClient.js';

const PREVIEW_TTL_MINUTES = 10;
const PREVIEW_STORE = new Map<
  string,
  {
    payload: CreateRoutinePayload;
    createdAt: number;
  }
>();

export interface PreviewResult {
  previewToken: string;
  summaryLines: string[];
}

export function preview(title: string, exercises: DraftWorkoutExercise[], includeWarmup: boolean = true, includeWarmupCooldown: boolean = false): PreviewResult {
  const payload = buildCreateRoutinePayload(title, exercises, undefined, includeWarmup, includeWarmupCooldown);
  const token = randomUUID();
  const now = Date.now();

  PREVIEW_STORE.set(token, { payload, createdAt: now });

  // Clean up expired tokens
  for (const [t, data] of PREVIEW_STORE) {
    const ageMinutes = (now - data.createdAt) / (1000 * 60);
    if (ageMinutes > PREVIEW_TTL_MINUTES) {
      PREVIEW_STORE.delete(t);
    }
  }

  // Build human-readable summary
  const warmupNote = includeWarmup ? ' (+ warmup sets)' : '';
  const exerciseCount = exercises.length + (includeWarmupCooldown ? 2 : 0);
  const summaryLines = [
    `Creating routine: "${title}"`,
    `${exerciseCount} exercises, estimated ${Math.round(
      exercises.reduce((sum, e) => sum + e.sets * 2, 0) / 60,
    )} minutes${warmupNote}`,
    '',
  ];

  if (includeWarmupCooldown) {
    summaryLines.push('  Warmup — Dynamic mobility');
  }

  for (const ex of exercises) {
    const weightText = ex.suggestedWeightKg !== null ? ` @ ${ex.suggestedWeightKg}kg` : '';
    const newBadge = ex.isNew ? ' [NEW]' : '';
    const setsText = includeWarmup ? `${ex.sets + 1}x${ex.targetReps}` : `${ex.sets}x${ex.targetReps}`;
    summaryLines.push(
      `  ${ex.title} — ${setsText}${weightText}${newBadge}`,
    );
  }

  if (includeWarmupCooldown) {
    summaryLines.push('  Stretching — Static stretching');
  }

  return { previewToken: token, summaryLines };
}

export async function confirmPush(
  title: string,
  exercises: DraftWorkoutExercise[],
  previewToken: string,
  includeWarmup: boolean = true,
  includeWarmupCooldown: boolean = false,
): Promise<{ id: string; title: string }> {
  // Validate token exists and isn't expired
  const stored = PREVIEW_STORE.get(previewToken);
  if (!stored) {
    throw new Error('Preview token not found or expired');
  }

  const ageMinutes = (Date.now() - stored.createdAt) / (1000 * 60);
  if (ageMinutes > PREVIEW_TTL_MINUTES) {
    PREVIEW_STORE.delete(previewToken);
    throw new Error('Preview token expired');
  }

  // Verify payload matches (sanity check against tampering)
  const currentPayload = buildCreateRoutinePayload(title, exercises, undefined, includeWarmup, includeWarmupCooldown);
  if (
    JSON.stringify(currentPayload) !== JSON.stringify(stored.payload)
  ) {
    throw new Error('Draft has been modified since preview');
  }

  // Delete token immediately to prevent double-submit
  PREVIEW_STORE.delete(previewToken);

  // Call Hevy API to create the routine
  const result = await hevyClient.createRoutine(stored.payload);

  return {
    id: result.id,
    title: result.title,
  };
}

export async function confirmCyclePush(
  workouts: Array<{ exercises: DraftWorkoutExercise[]; weekNumber: number; summary: string }>,
  includeWarmup: boolean = true,
  includeWarmupCooldown: boolean = false,
): Promise<{ folderId: string; folderTitle: string; routineCount: number; routines: Array<{ id: string; title: string }> }> {
  // Create routine folder for the 8-week cycle
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const folderTitle = `8-Week Cycle - ${today}`;
  const folder = await hevyClient.createRoutineFolder(folderTitle);

  const createdRoutines: Array<{ id: string; title: string }> = [];

  try {
    // Push each of the 24 workouts to the folder
    for (const workout of workouts) {
      const routineTitle = workout.summary;
      const payload = buildCreateRoutinePayload(
        routineTitle,
        workout.exercises,
        folder.id,
        includeWarmup,
        includeWarmupCooldown,
      );

      const routine = await hevyClient.createRoutine(payload);
      createdRoutines.push({
        id: routine.id,
        title: routine.title,
      });
    }
  } catch (err) {
    throw new Error(`Failed to create cycle routines: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    folderId: folder.id,
    folderTitle: folder.title,
    routineCount: createdRoutines.length,
    routines: createdRoutines,
  };
}
