export interface ExerciseProgressionState {
  exerciseTemplateId: string;
  repRangeLow: number;
  repRangeHigh: number;
  currentWeightKg: number;
  currentTargetReps: number;
  consecutiveMisses: number;
  consecutiveSameWeightSessions: number;
}

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

export interface AnalysisResult {
  exerciseTemplateId: string;
  title: string;
  status: 'ok' | 'insufficient_data' | 'cardio';
  sessionsCount?: number;
  suggestion?: Suggestion;
}
