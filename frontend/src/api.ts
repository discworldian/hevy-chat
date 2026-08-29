export class ApiError extends Error {
  constructor(
    public status: number,
    public retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = '/api';

async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      // ignore parse error
    }

    throw new ApiError(
      response.status,
      body.retryable ?? true,
      body.error || `HTTP ${response.status}`,
    );
  }

  return response.json();
}

export async function getHealth() {
  return fetchApi('/health');
}

export async function getWorkouts() {
  return fetchApi('/workouts');
}

export async function refreshWorkouts() {
  return fetchApi('/workouts/refresh', { method: 'POST' });
}

export async function getWorkoutAdvice(workoutId: string) {
  return fetchApi(`/workouts/${workoutId}/advice`);
}

export async function getExercises() {
  return fetchApi('/exercises');
}

export async function getExerciseAnalysis(templateId: string, location: string = 'home') {
  return fetchApi(`/exercises/${templateId}/analysis?location=${location}`);
}

export async function getExercisePlan(templateId: string, location: string = 'home') {
  return fetchApi(`/exercises/${templateId}/plan?location=${location}`);
}

export async function getPlan(location: string = 'home') {
  return fetchApi(`/plan?location=${location}`);
}

export async function getAnalyticsOverview() {
  return fetchApi('/analytics/overview');
}

export async function getExerciseAnalytics(templateId: string) {
  return fetchApi(`/analytics/exercise/${templateId}`);
}

export async function getBodyMeasurements() {
  return fetchApi('/analytics/body-measurements');
}

export async function getEquipment(location: string) {
  return fetchApi(`/equipment/${location}`);
}

export async function updateHomeEquipment(items: any[]) {
  return fetchApi('/equipment/home', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function previewPush(routineId: string | null, week: number) {
  return fetchApi('/push/preview', {
    method: 'POST',
    body: JSON.stringify({ routineId, week }),
  });
}

export async function confirmPush(routineId: string | null, week: number, previewToken: string) {
  return fetchApi('/push/confirm', {
    method: 'POST',
    body: JSON.stringify({ routineId, week, previewToken }),
  });
}

export async function getTrainingSettings() {
  return fetchApi('/settings/training');
}

export async function updateTrainingSettings(weeklyFrequencyTarget: number) {
  return fetchApi('/settings/training', {
    method: 'PUT',
    body: JSON.stringify({ weeklyFrequencyTarget }),
  });
}

export async function restartPlan(templateId: string) {
  return fetchApi(`/exercises/${templateId}/plan/restart`, { method: 'POST' });
}

export async function generateDraftWorkout(minutesAvailable: number, location: 'home' | 'gym', splitDay: 'push' | 'pull' | 'legs', includeCardio: boolean = false, includeAbdominals: boolean = false, includeWarmupCooldown: boolean = false) {
  return fetchApi('/draft-workout/generate', {
    method: 'POST',
    body: JSON.stringify({ minutesAvailable, location, splitDay, includeCardio, includeAbdominals, includeWarmupCooldown }),
  });
}

export async function generateDraftCycle(minutesAvailable: number, location: 'home' | 'gym', includeCardio: boolean = false, includeAbdominals: boolean = false, includeWarmupCooldown: boolean = false) {
  return fetchApi('/draft-workout/generate-cycle', {
    method: 'POST',
    body: JSON.stringify({ minutesAvailable, location, includeCardio, includeAbdominals, includeWarmupCooldown }),
  });
}

export async function previewDraftPush(title: string, exercises: any[], includeWarmup: boolean = true, includeWarmupCooldown: boolean = false) {
  return fetchApi('/draft-workout/push/preview', {
    method: 'POST',
    body: JSON.stringify({ title, exercises, includeWarmup, includeWarmupCooldown }),
  });
}

export async function confirmDraftPush(title: string, exercises: any[], previewToken: string, includeWarmup: boolean = true, includeWarmupCooldown: boolean = false) {
  return fetchApi('/draft-workout/push/confirm', {
    method: 'POST',
    body: JSON.stringify({ title, exercises, previewToken, includeWarmup, includeWarmupCooldown }),
  });
}

export async function getCurrentCycle() {
  return fetchApi('/cycle/current');
}

export async function getCycleProgress() {
  return fetchApi('/cycle/progress');
}

export async function startNewCycle(compoundExercises: { push: string[]; pull: string[]; legs: string[] }) {
  return fetchApi('/cycle/start', {
    method: 'POST',
    body: JSON.stringify({ compoundExercises }),
  });
}

export async function pushCycleToHevy(workouts: any[], includeWarmup: boolean = true, includeWarmupCooldown: boolean = false) {
  return fetchApi('/draft-workout/push/cycle', {
    method: 'POST',
    body: JSON.stringify({ workouts, includeWarmup, includeWarmupCooldown }),
  });
}

export async function getMuscleVolumeWeekly(weeksBack: number = 2) {
  return fetchApi(`/analytics/muscle-volume-weekly?weeksBack=${weeksBack}`);
}
