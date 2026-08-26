export interface WorkoutSet {
  index: number;
  type: 'warmup' | 'normal' | 'failure' | 'dropset';
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null; // 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10
  custom_metric: number | null;
}

export interface WorkoutExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  supersets_id: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  title: string;
  description: string | null;
  routine_id: string | null;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  created_at: string;
  updated_at: string;
  exercises: WorkoutExercise[];
}

export interface ExerciseTemplate {
  id: string;
  title: string;
  category: string | null;
  primary_muscle_group: string | null;
}

export interface RoutineSet {
  index: number;
  type: 'warmup' | 'normal' | 'failure' | 'dropset';
  weight_kg: number | null;
  reps: number | null;
}

export interface RoutineExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  supersets_id: number | null;
  notes: string | null;
  sets: RoutineSet[];
}

export interface Routine {
  id: string;
  title: string;
  notes: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  exercises: RoutineExercise[];
}

export interface RoutineFolder {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface BodyMeasurement {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  bodyweight_kg: number | null;
  custom_measurements: Record<string, number>;
  created_at: string;
  updated_at: string;
}
