import type { WorkoutSet } from '../hevyTypes.js';
import type { ExerciseProgressionState, Suggestion } from './types.js';
import { getIncrementForExercise, roundToNearestIncrement } from './incrementTable.js';
import type { ExerciseTemplate } from '../hevyTypes.js';

interface SessionData {
  date: string;
  sets: WorkoutSet[];
}

export function computeEstimated1RM(weightKg: number, reps: number): number {
  // Epley formula: weight × (1 + reps / 30)
  return weightKg * (1 + reps / 30);
}

function computeConsecutiveMisses(sessions: SessionData[], repRangeLow: number): number {
  let count = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const reps = session.sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
    if (reps.length === 0) break;
    const minReps = Math.min(...reps);
    if (minReps < repRangeLow) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function computeConsecutiveSameWeightSessions(sessions: SessionData[], currentWeightKg: number): number {
  let count = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const maxWeight = Math.max(...session.sets.map((s) => s.weight_kg ?? 0));
    if (maxWeight === currentWeightKg) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function getVolumeForSession(sets: WorkoutSet[]): number {
  return sets.reduce((sum, set) => {
    if (set.type !== 'warmup' && set.weight_kg && set.reps) {
      return sum + set.weight_kg * set.reps;
    }
    return sum;
  }, 0);
}

function getAverageVolume(sessions: SessionData[], lookbackCount: number = 3): number {
  if (sessions.length < 2) return 0;
  const recentSessions = sessions.slice(Math.max(0, sessions.length - lookbackCount - 1), sessions.length - 1);
  if (recentSessions.length === 0) return 0;
  const totalVolume = recentSessions.reduce((sum, s) => sum + getVolumeForSession(s.sets), 0);
  return totalVolume / recentSessions.length;
}

function checkPersonalRecord(
  sets: WorkoutSet[],
  allSessions: SessionData[],
): { isPersonalRecord: boolean; prType?: 'weight' | 'reps' | 'estimated1rm' } {
  if (allSessions.length === 0) return { isPersonalRecord: false };

  let sessionMaxWeight = 0;
  let sessionMaxReps = 0;
  let sessionBest1RM = 0;

  for (const set of sets) {
    if (set.type !== 'warmup' && set.weight_kg && set.reps) {
      sessionMaxWeight = Math.max(sessionMaxWeight, set.weight_kg);
      sessionMaxReps = Math.max(sessionMaxReps, set.reps);
      sessionBest1RM = Math.max(sessionBest1RM, computeEstimated1RM(set.weight_kg, set.reps));
    }
  }

  let allTimeMaxWeight = 0;
  let allTimeMaxReps = 0;
  let allTimeBest1RM = 0;

  for (const session of allSessions) {
    for (const set of session.sets) {
      if (set.type !== 'warmup' && set.weight_kg && set.reps) {
        allTimeMaxWeight = Math.max(allTimeMaxWeight, set.weight_kg);
        allTimeMaxReps = Math.max(allTimeMaxReps, set.reps);
        allTimeBest1RM = Math.max(allTimeBest1RM, computeEstimated1RM(set.weight_kg, set.reps));
      }
    }
  }

  if (sessionMaxWeight > allTimeMaxWeight) {
    return { isPersonalRecord: true, prType: 'weight' };
  }
  if (sessionMaxReps > allTimeMaxReps) {
    return { isPersonalRecord: true, prType: 'reps' };
  }
  if (sessionBest1RM > allTimeBest1RM * 1.01) {
    // Allow 1% tolerance for rounding
    return { isPersonalRecord: true, prType: 'estimated1rm' };
  }

  return { isPersonalRecord: false };
}

function buildVerdict(
  repOutcome: string,
  avgRpe: number | null,
  prData: { isPersonalRecord: boolean; prType?: 'weight' | 'reps' | 'estimated1rm' },
  volumeChange: number,
): string {
  const parts: string[] = [];

  // Rep outcome
  parts.push(repOutcome);

  // RPE band (rounded to 1 decimal)
  if (avgRpe !== null) {
    const rpeRounded = Math.round(avgRpe * 10) / 10;
    if (avgRpe <= 7) {
      parts.push(`comfortable effort (RPE ${rpeRounded})`);
    } else if (avgRpe <= 8) {
      parts.push(`perfect zone (RPE ${rpeRounded})`);
    } else {
      parts.push(`challenging effort (RPE ${rpeRounded})`);
    }
  }

  // PR
  if (prData.isPersonalRecord) {
    const prLabel = prData.prType === 'weight' ? 'weight' : prData.prType === 'reps' ? 'reps' : '1RM';
    parts.push(`new ${prLabel} PR! 🎉`);
  }

  // Volume trend
  if (Math.abs(volumeChange) > 5) {
    const trend = volumeChange > 0 ? `↑${volumeChange.toFixed(0)}%` : `↓${Math.abs(volumeChange).toFixed(0)}%`;
    parts.push(`volume ${trend}`);
  }

  return parts.join(', ') + '.';
}

export function computeProgression(
  sessions: SessionData[],
  currentState: ExerciseProgressionState,
  exercise: ExerciseTemplate | null,
  applyConservativeHedge: boolean = false,
): Suggestion {
  if (sessions.length === 0) {
    return {
      action: 'hold',
      nextWeightKg: currentState.currentWeightKg,
      nextRepRangeLow: currentState.repRangeLow,
      nextRepRangeHigh: currentState.repRangeHigh,
      nextTargetReps: currentState.currentTargetReps,
      rationale: 'No session data available',
      verdict: 'Insufficient data.',
      isPersonalRecord: false,
      plateauWarning: false,
    };
  }

  const lastSession = sessions[sessions.length - 1];
  const repsAchieved = lastSession.sets.map((s) => s.reps ?? 0).filter((r) => r > 0);

  if (repsAchieved.length === 0) {
    return {
      action: 'hold',
      nextWeightKg: currentState.currentWeightKg,
      nextRepRangeLow: currentState.repRangeLow,
      nextRepRangeHigh: currentState.repRangeHigh,
      nextTargetReps: currentState.currentTargetReps,
      rationale: 'No rep data available (cardio/duration exercise)',
      verdict: 'Cardio/duration-based exercise.',
      isPersonalRecord: false,
      plateauWarning: false,
    };
  }

  const minReps = Math.min(...repsAchieved);
  const maxReps = Math.max(...repsAchieved);
  const allHitTarget = repsAchieved.every((r) => r >= currentState.currentTargetReps);
  const hitTopOfRange = repsAchieved.every((r) => r >= currentState.repRangeHigh);
  const missedBottom = repsAchieved.some((r) => r < currentState.repRangeLow);

  // Get RPE data
  const rpesFromSession = lastSession.sets
    .map((s) => s.rpe ?? null)
    .filter((r) => r !== null) as number[];
  const avgRpe = rpesFromSession.length > 0 ? rpesFromSession.reduce((a, b) => a + b, 0) / rpesFromSession.length : null;

  // Compute metrics
  const consecutiveMisses = computeConsecutiveMisses(sessions, currentState.repRangeLow);
  const consecutiveSameWeight = computeConsecutiveSameWeightSessions(sessions, currentState.currentWeightKg);
  const lastSessionVolume = getVolumeForSession(lastSession.sets);
  const avgVolume = getAverageVolume(sessions);
  const volumeChange = avgVolume > 0 ? ((lastSessionVolume - avgVolume) / avgVolume) * 100 : 0;
  const prData = checkPersonalRecord(lastSession.sets, sessions);

  const increment = getIncrementForExercise(exercise);

  let verdict = '';
  let plateauWarning = false;
  let structuralSuggestion: { type: 'add_set' | 'shift_rep_range'; rationale: string } | undefined;

  // Determine action
  if (hitTopOfRange) {
    verdict = buildVerdict('Hit top of range', avgRpe, prData, volumeChange);

    let finalIncrement = increment;
    let rpeNote = '';

    if (applyConservativeHedge && avgRpe !== null && avgRpe <= 8) {
      // Frequency-based hedge: apply half increment
      finalIncrement = increment / 2;
      rpeNote = ` (training below target frequency, applying smaller increment)`;
    } else if (avgRpe !== null) {
      if (avgRpe <= 8) {
        rpeNote = ` at RPE ${avgRpe} (solid signal to progress)`;
      } else if (avgRpe >= 9.5) {
        finalIncrement = increment / 2;
        rpeNote = ` at RPE ${avgRpe} (high effort, applying half-increment as a hedge)`;
      } else {
        rpeNote = ` at RPE ${avgRpe}`;
      }
    }

    const nextWeight = roundToNearestIncrement(currentState.currentWeightKg + finalIncrement, 0.5);

    return {
      action: 'increase_weight',
      nextWeightKg: nextWeight,
      nextRepRangeLow: currentState.repRangeLow,
      nextRepRangeHigh: currentState.repRangeHigh,
      nextTargetReps: currentState.repRangeLow,
      rationale: `Hit top of rep range (${minReps}-${maxReps} reps)${rpeNote}. Increasing weight by ${(nextWeight - currentState.currentWeightKg).toFixed(1)}kg.`,
      verdict,
      isPersonalRecord: prData.isPersonalRecord,
      prType: prData.prType,
      plateauWarning,
    };
  }

  if (!missedBottom && allHitTarget) {
    verdict = buildVerdict('Within rep range', avgRpe, prData, volumeChange);

    const nextReps = Math.min(currentState.currentTargetReps + 1, currentState.repRangeHigh);
    return {
      action: 'increase_reps',
      nextWeightKg: currentState.currentWeightKg,
      nextRepRangeLow: currentState.repRangeLow,
      nextRepRangeHigh: currentState.repRangeHigh,
      nextTargetReps: nextReps,
      rationale: `Within rep range (${minReps}-${maxReps} reps). Increasing target reps from ${currentState.currentTargetReps} to ${nextReps}.`,
      verdict,
      isPersonalRecord: prData.isPersonalRecord,
      prType: prData.prType,
      plateauWarning,
    };
  }

  if (missedBottom) {
    if (consecutiveMisses >= 1) {
      // Second miss — deload
      plateauWarning = true;
      verdict = buildVerdict('Missed reps (deloading)', avgRpe, prData, volumeChange);

      const deloadWeight = roundToNearestIncrement(currentState.currentWeightKg * 0.9, 0.5);
      return {
        action: 'deload',
        nextWeightKg: deloadWeight,
        nextRepRangeLow: currentState.repRangeLow,
        nextRepRangeHigh: currentState.repRangeHigh,
        nextTargetReps: currentState.repRangeLow,
        rationale: `Second consecutive miss (${minReps}-${maxReps} vs. target ${currentState.currentTargetReps}). Deloading by 10% to ${deloadWeight}kg and resetting to ${currentState.repRangeLow} reps.`,
        verdict,
        isPersonalRecord: prData.isPersonalRecord,
        prType: prData.prType,
        plateauWarning,
      };
    } else {
      // First miss — repeat
      verdict = buildVerdict('Missed reps (repeat weight)', avgRpe, prData, volumeChange);

      // Check for structural plateau: 3+ sessions at same weight with high RPE
      if (consecutiveSameWeight >= 3 && avgRpe !== null && avgRpe >= 9) {
        plateauWarning = true;

        // Decide structural suggestion: add set vs. shift rep range
        const avgSetsCount = sessions.slice(-3).reduce((sum, s) => sum + s.sets.length, 0) / 3;
        let suggestion: { type: 'add_set' | 'shift_rep_range'; rationale: string };

        if (avgSetsCount <= 3) {
          suggestion = {
            type: 'add_set',
            rationale: `Stuck at ${currentState.currentWeightKg}kg for ${consecutiveSameWeight} sessions at high effort. Consider adding a set before increasing weight.`,
          };
        } else {
          const newRepRangeLow = Math.max(currentState.repRangeLow - 3, 5);
          const newRepRangeHigh = newRepRangeLow + 4;
          suggestion = {
            type: 'shift_rep_range',
            rationale: `Stuck at ${currentState.currentWeightKg}kg for ${consecutiveSameWeight} sessions at high effort. Consider shifting to a ${newRepRangeLow}-${newRepRangeHigh} rep range with larger increments.`,
          };
        }

        structuralSuggestion = suggestion;
      }

      return {
        action: 'hold',
        nextWeightKg: currentState.currentWeightKg,
        nextRepRangeLow: currentState.repRangeLow,
        nextRepRangeHigh: currentState.repRangeHigh,
        nextTargetReps: currentState.currentTargetReps,
        rationale: `Missed target reps (${minReps}-${maxReps} vs. target ${currentState.currentTargetReps}). Repeating same weight/reps next time.`,
        verdict,
        isPersonalRecord: prData.isPersonalRecord,
        prType: prData.prType,
        plateauWarning,
        structuralSuggestion,
      };
    }
  }

  // Fallback
  verdict = buildVerdict('No clear signal', avgRpe, prData, volumeChange);

  return {
    action: 'hold',
    nextWeightKg: currentState.currentWeightKg,
    nextRepRangeLow: currentState.repRangeLow,
    nextRepRangeHigh: currentState.repRangeHigh,
    nextTargetReps: currentState.currentTargetReps,
    rationale: 'No clear progression signal.',
    verdict,
    isPersonalRecord: prData.isPersonalRecord,
    prType: prData.prType,
    plateauWarning: false,
  };
}
