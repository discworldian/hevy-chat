import { getConfig } from './config.js';
import type {
  Workout,
  ExerciseTemplate,
  Routine,
  RoutineFolder,
  BodyMeasurement,
} from './hevyTypes.js';

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

export class HevyApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = 'HevyApiError';
  }
}

async function fetch_with_retries(
  url: string,
  options: RequestInit,
  retries = 2,
  backoff_base = 1000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // 429 (too many requests) or 5xx should retry
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const delay = backoff_base * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Non-retryable or final attempt
      return response;
    } catch (err) {
      if (attempt < retries) {
        const delay = backoff_base * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unexpected: retries exhausted');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const config = getConfig();

  if (!config.HEVY_API_KEY) {
    throw new HevyApiError(
      400,
      'HEVY_API_KEY is not configured',
      false,
    );
  }

  const headers = {
    'Content-Type': 'application/json',
    'api-key': config.HEVY_API_KEY,
    ...options.headers,
  };

  const url = `${HEVY_API_BASE}${endpoint}`;

  try {
    const response = await fetch_with_retries(url, { ...options, headers });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        errorMessage = body.message || errorMessage;
      } catch {
        // ignore parse error
      }

      const retryable = response.status === 429 || response.status >= 500;
      throw new HevyApiError(response.status, errorMessage, retryable);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (err) {
    if (err instanceof HevyApiError) {
      throw err;
    }
    throw new HevyApiError(500, String(err), true);
  }
}

export async function listWorkouts(
  page: number = 1,
  pageSize: number = 10,
): Promise<Workout[]> {
  const data: { workouts: Workout[] } = await request(
    `/workouts?page=${page}&pageSize=${pageSize}`,
  );
  return data.workouts || [];
}

export async function getWorkoutsCount(): Promise<number> {
  const data: { workout_count?: number; total_count?: number } = await request('/workouts/count');
  const count = data.workout_count ?? data.total_count ?? 0;
  return count;
}

export async function getWorkoutEvents(since?: string): Promise<any> {
  let query = '';
  if (since) {
    query = `?since=${encodeURIComponent(since)}`;
  }
  return await request(`/workouts/events${query}`);
}

export async function getWorkout(id: string): Promise<Workout> {
  return await request(`/workouts/${id}`);
}

export async function listRoutines(page: number = 1, pageSize: number = 10): Promise<Routine[]> {
  const data: { routines: Routine[] } = await request(
    `/routines?page=${page}&pageSize=${pageSize}`,
  );
  return data.routines || [];
}

export async function createRoutine(body: any): Promise<Routine> {
  return await request('/routines', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getRoutine(id: string): Promise<Routine> {
  return await request(`/routines/${id}`);
}

export async function updateRoutine(id: string, body: any): Promise<Routine> {
  return await request(`/routines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function listExerciseTemplates(
  page: number = 1,
  pageSize: number = 100,
): Promise<ExerciseTemplate[]> {
  const data: { exercise_templates: ExerciseTemplate[] } = await request(
    `/exercise_templates?page=${page}&pageSize=${pageSize}`,
  );
  return data.exercise_templates || [];
}

export async function getExerciseTemplate(id: string): Promise<ExerciseTemplate> {
  return await request(`/exercise_templates/${id}`);
}

export async function listRoutineFolders(): Promise<RoutineFolder[]> {
  const data: { routine_folders: RoutineFolder[] } = await request(
    '/routine_folders',
  );
  return data.routine_folders || [];
}

export async function createRoutineFolder(title: string): Promise<RoutineFolder> {
  return await request('/routine_folders', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function getUserInfo(): Promise<any> {
  return await request('/user/info');
}

export async function listBodyMeasurements(): Promise<BodyMeasurement[]> {
  const data: { body_measurements: BodyMeasurement[] } = await request(
    '/body_measurements',
  );
  return data.body_measurements || [];
}

export async function getBodyMeasurement(date: string): Promise<BodyMeasurement> {
  return await request(`/body_measurements/${date}`);
}
