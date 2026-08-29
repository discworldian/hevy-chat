import type { TrainingCycle, ArchivedCycle } from './cycleManager.js';
import type { Workout, ExerciseTemplate } from '../hevyTypes.js';
import type { DraftWorkoutExercise } from './draftWorkoutBuilder.js';
import { computeEstimated1RM } from './progression.js';
import { computeMuscleVolumeForRange } from './muscleVolume.js';
import { getAnimalComparison } from './animalComparison.js';

export const SCIENCE_TIDBITS = [
  'Meta-analyses show consistent training beats any specific program design (Schoenfeld 2016).',
  'Progressive overload is the single most evidence-backed driver of strength gains (Linardon et al. 2021).',
  'Drop sets produce equivalent hypertrophy to traditional sets in 40% less time (Sødal et al. 2023).',
  'Training to near-failure produces maximal strength gains, not just hypertrophy (Schoenfeld et al. 2015).',
  'Muscle protein synthesis peaks 24–48 hours post-workout (Tang et al. 2009).',
  'Frequency (2–3x per week per muscle) matters more than volume alone for strength gains (Schoenfeld et al. 2016).',
  'Sleeping 7–9 hours enhances recovery and muscle protein synthesis (Walker 2017).',
];

interface GenerateNudgesContext {
  cycle: TrainingCycle | ArchivedCycle | null;
  workouts: Workout[];
  templates: ExerciseTemplate[];
  draftExercises: DraftWorkoutExercise[];
  splitDay?: 'push' | 'pull' | 'legs';
}

export async function generateNudges(context: GenerateNudgesContext): Promise<string[]> {
  const nudges: Array<{ type: string; message: string; priority: number }> = [];

  // PR proximity: "You're Xkg away from your all-time best on {title}."
  for (const exercise of context.draftExercises) {
    if (!exercise.suggestedWeightKg || exercise.suggestedWeightKg === 0) continue;

    // Find all sessions for this exercise
    const exerciseSessions = [];
    for (const workout of context.workouts) {
      const exerciseData = workout.exercises.find((e) => e.exercise_template_id === exercise.exerciseTemplateId);
      if (exerciseData) {
        const maxWeight = Math.max(
          ...exerciseData.sets.filter((s) => s.type === 'normal' || s.type === 'dropset').map((s) => s.weight_kg || 0),
        );
        if (maxWeight > 0) {
          exerciseSessions.push(maxWeight);
        }
      }
    }

    if (exerciseSessions.length > 0) {
      const maxEverWeight = Math.max(...exerciseSessions);
      const delta = maxEverWeight - exercise.suggestedWeightKg;

      // Within ~5% of all-time
      if (delta > 0 && delta <= maxEverWeight * 0.05) {
        nudges.push({
          type: 'pr_proximity',
          message: `You're ${delta.toFixed(1)}kg away from your all-time best on ${exercise.title}.`,
          priority: 100,
        });
        break; // Only one PR proximity nudge
      }
    }
  }

  // Cycle progress: "Week X of 8" or consistency message
  if (context.cycle && !context.cycle.endDate) {
    const weekNumber = context.cycle.weekNumber;
    if (weekNumber >= 6) {
      nudges.push({
        type: 'cycle_progress',
        message: `Week ${weekNumber}/8. Home stretch—consistency is your superpower now.`,
        priority: 90,
      });
    } else if (weekNumber >= 3) {
      nudges.push({
        type: 'cycle_progress',
        message: `Week ${weekNumber}/8. Progressive overload takes time. You're on track.`,
        priority: 90,
      });
    }
  }

  // Volume trend: this-week vs last-week for the split day
  if (context.splitDay) {
    const today = new Date();
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setHours(23, 59, 59, 999);
    const thisWeekStart = new Date(thisWeekEnd);
    thisWeekStart.setDate(thisWeekStart.getDate() - 6);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    lastWeekStart.setHours(0, 0, 0, 0);

    const thisWeekVolume = computeMuscleVolumeForRange(context.workouts, context.templates, thisWeekStart, thisWeekEnd);
    const lastWeekVolume = computeMuscleVolumeForRange(context.workouts, context.templates, lastWeekStart, lastWeekEnd);

    // Get primary muscles for split day
    const splitMuscles =
      context.splitDay === 'push'
        ? ['chest', 'shoulders', 'triceps']
        : context.splitDay === 'pull'
          ? ['lats', 'upper_back', 'biceps']
          : ['quadriceps', 'glutes', 'hamstrings'];

    let maxPctChange = 0;
    let trendMuscle = '';
    for (const muscle of splitMuscles) {
      const thisVol = thisWeekVolume[muscle] || 0;
      const lastVol = lastWeekVolume[muscle] || 0;
      if (lastVol > 0) {
        const pctChange = (thisVol - lastVol) / lastVol;
        if (pctChange > maxPctChange) {
          maxPctChange = pctChange;
          trendMuscle = muscle;
        }
      }
    }

    if (maxPctChange > 0.1 && trendMuscle) {
      nudges.push({
        type: 'volume_trend',
        message: `Your ${trendMuscle.split('_').join(' ')} volume is up ${(maxPctChange * 100).toFixed(0)}% this week. That's progress.`,
        priority: 70,
      });
    }
  }

  // Animal weight comparison: total suggested volume across draft
  const totalSuggestedVolume = context.draftExercises.reduce((sum, ex) => {
    if (ex.suggestedWeightKg && ex.suggestedWeightKg > 0) {
      return sum + ex.suggestedWeightKg * ex.sets * (ex.targetReps || 10);
    }
    return sum;
  }, 0);

  if (totalSuggestedVolume > 0) {
    const animal = getAnimalComparison(totalSuggestedVolume);
    if (animal) {
      nudges.push({
        type: 'animal',
        message: `Today's volume is roughly ${Math.round(totalSuggestedVolume / animal.weight)}x an adult ${animal.name}.`,
        priority: 50,
      });
    }
  }

  // Select top 1-2 nudges by priority
  nudges.sort((a, b) => b.priority - a.priority);
  const selected = nudges.slice(0, 2).map((n) => n.message);

  // If none selected, add a science tidbit
  if (selected.length === 0) {
    const tidbit = SCIENCE_TIDBITS[Math.floor(Math.random() * SCIENCE_TIDBITS.length)];
    selected.push(tidbit);
  }

  return selected;
}
