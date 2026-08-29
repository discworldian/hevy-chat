export interface Suggestion {
  action: 'increase_weight' | 'increase_reps' | 'hold' | 'deload';
  nextWeightKg: number;
  nextRepRangeLow: number;
  nextRepRangeHigh: number;
  nextTargetReps: number;
  rationale: string;
  verdict: string;
  isPersonalRecord: boolean;
  prType?: 'weight' | 'reps' | 'estimated1rm';
  plateauWarning: boolean;
  structuralSuggestion?: { type: 'add_set' | 'shift_rep_range'; rationale: string };
}

export interface PlanWeek {
  week: number;
  targetSets: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  targetReps: number;
  weightKg: number;
  actual: boolean;
  loggedWeightKg?: number;
  loggedReps?: number;
}

export interface ExercisePlan {
  exerciseTemplateId: string;
  title: string;
  status: 'ok' | 'insufficient_data' | 'cardio' | 'unavailable';
  sessionsCount?: number;
  suggestion?: Suggestion;
  weeks?: PlanWeek[];
  missingEquipment?: string[];
}

export interface Workout {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  exercises: any[];
}

export interface ExerciseTemplate {
  templateId: string;
  name: string;
  category: string | null;
  primaryMuscleGroup: string | null;
}

export interface HealthStatus {
  ok: boolean;
  hevyKeyPresent: boolean;
  hevyKeyValid: boolean | null;
}

export interface SessionContext {
  durationMinutes: number;
  durationVsAverage: 'much_shorter' | 'shorter' | 'typical' | 'longer' | 'much_longer';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface FrequencyStatus {
  actualPerWeek: number;
  targetPerWeek: number;
  belowTarget: boolean;
}

export interface WorkoutAdvice {
  workoutId: string;
  sessionContext: SessionContext;
  frequencyStatus: FrequencyStatus;
  exercises: Array<{
    exerciseTemplateId: string;
    title: string;
    status: string;
    suggestion?: Suggestion;
  }>;
}

export interface DraftWorkoutExercise {
  exerciseTemplateId: string;
  title: string;
  primaryMuscleGroup: string | null;
  isNew: boolean;
  daysSinceTrained: number | null;
  sets: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  targetReps: number;
  suggestedWeightKg: number | null;
  suggestion?: Suggestion;
  useDropSets?: boolean;
  includeWarmupSet?: boolean;
  warmupWeightKg?: number | null;
  warmupReps?: number;
}

export interface DraftWorkout {
  location: 'home' | 'gym';
  minutesAvailable: number;
  estimatedMinutes: number;
  summary: string;
  exercises: DraftWorkoutExercise[];
  cycleInfo?: {
    cycleId: string;
    weekNumber: number;
    isFixed: boolean;
  };
  nudges?: string[];
}

export interface ExerciseProgressSet {
  reps: number;
  targetReps: number;
  weight: number;
  classification: 'hit' | 'exceeded' | 'missed';
}

export interface ExerciseProgressSession {
  date: string;
  estimated1RM: number;
  bestSetVolume: number;
  sets: ExerciseProgressSet[];
}

export interface ExerciseCycleProgress {
  sessions: ExerciseProgressSession[];
}
