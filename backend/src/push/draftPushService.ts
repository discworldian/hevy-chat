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

export function preview(title: string, exercises: DraftWorkoutExercise[], includeWarmup: boolean = true): PreviewResult {
  const payload = buildCreateRoutinePayload(title, exercises, undefined, includeWarmup);
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
  const warmupNote = includeWarmup ? ' (+ warmup)' : '';
  const summaryLines = [
    `Creating routine: "${title}"`,
    `${exercises.length} exercises, estimated ${Math.round(
      exercises.reduce((sum, e) => sum + e.sets * 2, 0) / 60,
    )} minutes${warmupNote}`,
    '',
  ];

  for (const ex of exercises) {
    const weightText = ex.suggestedWeightKg !== null ? ` @ ${ex.suggestedWeightKg}kg` : '';
    const newBadge = ex.isNew ? ' [NEW]' : '';
    const setsText = includeWarmup ? `${ex.sets + 1}x${ex.targetReps}` : `${ex.sets}x${ex.targetReps}`;
    summaryLines.push(
      `  ${ex.title} — ${setsText}${weightText}${newBadge}`,
    );
  }

  return { previewToken: token, summaryLines };
}

export async function confirmPush(
  title: string,
  exercises: DraftWorkoutExercise[],
  previewToken: string,
  includeWarmup: boolean = true,
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
  const currentPayload = buildCreateRoutinePayload(title, exercises, undefined, includeWarmup);
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
