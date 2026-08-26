import type { Workout } from '../hevyTypes.js';

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

export function getSessionContext(workout: Workout, allWorkouts: Workout[]): SessionContext {
  const startTime = new Date(workout.start_time).getTime();
  const endTime = new Date(workout.end_time).getTime();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  // Time of day
  const hour = new Date(workout.start_time).getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  // Duration vs. average (90-day window)
  const now = new Date(workout.start_time).getTime();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const recentWorkouts = allWorkouts.filter((w) => {
    const wTime = new Date(w.start_time).getTime();
    return now - wTime <= ninetyDaysMs;
  });

  let avgDuration = 0;
  if (recentWorkouts.length > 1) {
    const total = recentWorkouts.reduce((sum, w) => {
      const start = new Date(w.start_time).getTime();
      const end = new Date(w.end_time).getTime();
      return sum + (end - start) / 60000;
    }, 0);
    avgDuration = total / recentWorkouts.length;
  }

  let durationVsAverage: 'much_shorter' | 'shorter' | 'typical' | 'longer' | 'much_longer' = 'typical';
  if (avgDuration > 0) {
    const ratio = durationMinutes / avgDuration;
    if (ratio < 0.75) {
      durationVsAverage = 'much_shorter';
    } else if (ratio < 0.9) {
      durationVsAverage = 'shorter';
    } else if (ratio < 1.1) {
      durationVsAverage = 'typical';
    } else if (ratio < 1.25) {
      durationVsAverage = 'longer';
    } else {
      durationVsAverage = 'much_longer';
    }
  }

  return { durationMinutes, durationVsAverage, timeOfDay };
}

export function getFrequencyStatus(allWorkouts: Workout[], targetPerWeek: number): FrequencyStatus {
  // Trailing 4 weeks
  const now = new Date().getTime();
  const fourWeeksMs = 4 * 7 * 24 * 60 * 60 * 1000;
  const recentWorkouts = allWorkouts.filter((w) => {
    const wTime = new Date(w.start_time).getTime();
    return now - wTime <= fourWeeksMs;
  });

  const actualPerWeek = recentWorkouts.length / 4;
  const belowTarget = actualPerWeek < targetPerWeek;

  return { actualPerWeek: Math.round(actualPerWeek * 10) / 10, targetPerWeek, belowTarget };
}
