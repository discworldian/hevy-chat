import type { Workout, ExerciseTemplate } from '../hevyTypes.js';
import type { Location } from '../equipment/equipmentTypes.js';
import type { Suggestion } from '../analysis/types.js';
import * as cache from '../cache.js';
import { analyzeExercise } from './exerciseAnalysis.js';
import { computeMuscleRecency, rankMuscleGroups } from './muscleGroups.js';
import { estimateExerciseSeconds, EXERCISE_SETUP_OVERHEAD_SECONDS, SECONDS_PER_SET } from './exerciseTimeEstimate.js';
import { canExerciseBePerformed } from '../equipment/exerciseEquipmentMap.js';
import { isCompoundExercise } from './incrementTable.js';
import type { SplitDay } from './splitDefinitions.js';
import { getMuscleGroupsForSplit, getOptionalMuscleGroups } from './splitDefinitions.js';

const MUSCLE_GROUP_REGION: Record<string, 'upper' | 'lower' | 'core'> = {
  quadriceps: 'lower', glutes: 'lower', hamstrings: 'lower', calves: 'lower', lower_back: 'lower',
  chest: 'upper', back: 'upper', lats: 'upper', upper_back: 'upper', shoulders: 'upper', traps: 'upper',
  biceps: 'upper', triceps: 'upper', forearms: 'upper', wrists: 'upper',
  core: 'core', abs: 'core', obliques: 'core',
};

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
}

export interface DraftWorkout {
  location: Location;
  minutesAvailable: number;
  estimatedMinutes: number;
  summary: string;
  exercises: DraftWorkoutExercise[];
}

type DraftWorkoutError = { status: 'time_too_short'; minMinutesNeeded: number };

export async function buildDraftWorkout(
  minutesAvailable: number,
  location: Location,
  splitDay: SplitDay,
  includeCardio: boolean = false,
  includeAbdominals: boolean = false,
  includeWarmupCooldown: boolean = false,
): Promise<DraftWorkout | DraftWorkoutError> {
  const workoutsCache = await cache.readWorkouts();
  const templatesCache = await cache.readTemplates();

  const workouts = workoutsCache.workouts;
  const templates = templatesCache.templates;

  // Floor check: compute minimum viable single exercise
  const minExerciseSeconds = EXERCISE_SETUP_OVERHEAD_SECONDS + SECONDS_PER_SET.isolation;
  const availableSeconds = minutesAvailable * 60;
  if (availableSeconds < minExerciseSeconds) {
    const minMinutes = Math.ceil(minExerciseSeconds / 60);
    return { status: 'time_too_short', minMinutesNeeded: minMinutes };
  }

  // Compute muscle recency and rank by staleness
  const recency = await computeMuscleRecency(workouts, templates);
  let rankedMuscles = rankMuscleGroups(recency);

  // Exclude cardio if not allowed
  if (!includeCardio) {
    rankedMuscles = rankedMuscles.filter((m) => m !== 'cardio');
  }

  // Filter to split day muscles, optionally add accessory muscles
  const splitMuscles = new Set(getMuscleGroupsForSplit(splitDay));
  const accessoryMuscles = new Set(getOptionalMuscleGroups());

  const allAvailableMuscles = new Set(splitMuscles);
  if (includeAbdominals) {
    accessoryMuscles.forEach((m) => allAvailableMuscles.add(m));
  }
  rankedMuscles = rankedMuscles.filter((m) => allAvailableMuscles.has(m));

  // Track which muscles are addressed by the draft
  const addressedMuscles = new Set<string>();
  const selectedExercises: DraftWorkoutExercise[] = [];
  const usedTemplateIds = new Set<string>();
  let usedSeconds = 0;
  let compoundsSelected = 0;
  const MAX_COMPOUNDS = 4;

  // Helper to find exercise candidates for a muscle group (Note: requires location to be available at call site)
  async function findCandidates(muscleGroup: string): Promise<ExerciseTemplate[]> {
    const candidates: ExerciseTemplate[] = [];
    for (const t of templates) {
      // Must be available at the location
      const canPerform = await canExerciseBePerformed(t, location);
      if (!canPerform.available) {
        continue;
      }

      // Primary match first
      if (t.primary_muscle_group === muscleGroup) {
        candidates.push(t);
        continue;
      }

      // Fall back to secondary match if no primary candidates
      if (t.secondary_muscle_groups?.includes(muscleGroup)) {
        candidates.push(t);
      }
    }
    return candidates;
  }

  // Helper to build a DraftWorkoutExercise
  async function buildDraftExercise(
    template: ExerciseTemplate,
    sets: number,
    hasHistory: boolean,
    daysSinceTrained: number | null,
  ): Promise<DraftWorkoutExercise> {
    if (hasHistory) {
      // Get real progression suggestion
      const analysis = await analyzeExercise(
        template.id,
        workouts,
        template.title,
        workouts,
      );

      const suggestion = analysis.suggestion || {
        action: 'hold' as const,
        nextWeightKg: 0,
        nextRepRangeLow: 8,
        nextRepRangeHigh: 12,
        nextTargetReps: 10,
        rationale: 'Hold current weight',
        verdict: 'On hold',
        isPersonalRecord: false,
        plateauWarning: false,
      };

      return {
        exerciseTemplateId: template.id,
        title: template.title,
        primaryMuscleGroup: template.primary_muscle_group,
        isNew: false,
        daysSinceTrained,
        sets,
        targetRepsLow: suggestion.nextRepRangeLow,
        targetRepsHigh: suggestion.nextRepRangeHigh,
        targetReps: suggestion.nextTargetReps,
        suggestedWeightKg: suggestion.nextWeightKg,
        suggestion,
      };
    } else {
      // New exercise, no history
      return {
        exerciseTemplateId: template.id,
        title: template.title,
        primaryMuscleGroup: template.primary_muscle_group,
        isNew: true,
        daysSinceTrained: null,
        sets,
        targetRepsLow: 8,
        targetRepsHigh: 12,
        targetReps: 10,
        suggestedWeightKg: null,
      };
    }
  }

  // Helper to check if an exercise has been logged before
  function hasExerciseHistory(templateId: string): boolean {
    return workouts.some((w) => w.exercises.some((e) => e.exercise_template_id === templateId));
  }

  // Phase 1a: Select 3-4 compounds first, prioritizing split-day muscles
  for (const muscleGroup of rankedMuscles) {
    if (compoundsSelected >= MAX_COMPOUNDS || !splitMuscles.has(muscleGroup)) {
      continue; // Skip accessory muscles in compound phase
    }
    if (addressedMuscles.has(muscleGroup)) {
      continue;
    }

    const candidates = await findCandidates(muscleGroup);
    const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id));
    if (availableCandidates.length === 0) {
      continue;
    }

    // Prioritize compounds over accessories in Phase 1a
    const compoundCandidates = availableCandidates.filter((t) => isCompoundExercise(t));
    const candidatePool = compoundCandidates.length > 0 ? compoundCandidates : availableCandidates;

    // Prefer previously-logged exercises
    let selectedTemplate = candidatePool.find((t) => hasExerciseHistory(t.id));
    if (!selectedTemplate) {
      // Fall back to untried: prefer barbell/dumbbell
      selectedTemplate = candidatePool.sort((a, b) => {
        const aEquip = (a.equipment || 'other').toLowerCase();
        const bEquip = (b.equipment || 'other').toLowerCase();
        const aPreferred = aEquip === 'barbell' || aEquip === 'dumbbell' ? 0 : 1;
        const bPreferred = bEquip === 'barbell' || bEquip === 'dumbbell' ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        return candidatePool.indexOf(a) - candidatePool.indexOf(b);
      })[0]!;
    }

    // Compounds get 3 sets in Phase 1a
    const estSeconds = estimateExerciseSeconds(selectedTemplate, 3);
    if (usedSeconds + estSeconds <= availableSeconds) {
      const draftExercise = await buildDraftExercise(
        selectedTemplate,
        3,
        hasExerciseHistory(selectedTemplate.id),
        recency[muscleGroup]?.daysSinceTrained ?? null,
      );

      selectedExercises.push(draftExercise);
      usedSeconds += estSeconds;
      usedTemplateIds.add(selectedTemplate.id);
      addressedMuscles.add(muscleGroup);
      if (isCompoundExercise(selectedTemplate)) {
        compoundsSelected++;
      }
    }
  }

  // Phase 1b: Add accessories and remaining split-day muscles with 2-3 sets
  for (const muscleGroup of rankedMuscles) {
    if (addressedMuscles.has(muscleGroup)) {
      continue;
    }

    const candidates = await findCandidates(muscleGroup);
    const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id));
    if (availableCandidates.length === 0) {
      continue;
    }

    // In Phase 1b, prefer accessories but accept compounds
    const isolationCandidates = availableCandidates.filter((t) => !isCompoundExercise(t));
    const candidatePool = isolationCandidates.length > 0 ? isolationCandidates : availableCandidates;

    let selectedTemplate = candidatePool.find((t) => hasExerciseHistory(t.id));
    if (!selectedTemplate) {
      selectedTemplate = candidatePool.sort((a, b) => {
        const aEquip = (a.equipment || 'other').toLowerCase();
        const bEquip = (b.equipment || 'other').toLowerCase();
        const aPreferred = aEquip === 'barbell' || aEquip === 'dumbbell' ? 0 : 1;
        const bPreferred = bEquip === 'barbell' || bEquip === 'dumbbell' ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        return candidatePool.indexOf(a) - candidatePool.indexOf(b);
      })[0]!;
    }

    // Try 3 sets, then 2 for accessories
    let setsToAdd = 0;
    for (const attemptSets of [3, 2]) {
      const estSeconds = estimateExerciseSeconds(selectedTemplate, attemptSets);
      if (usedSeconds + estSeconds <= availableSeconds) {
        setsToAdd = attemptSets;
        break;
      }
    }

    if (setsToAdd === 0) {
      break; // Out of time
    }

    const draftExercise = await buildDraftExercise(
      selectedTemplate,
      setsToAdd,
      hasExerciseHistory(selectedTemplate.id),
      recency[muscleGroup]?.daysSinceTrained ?? null,
    );

    selectedExercises.push(draftExercise);
    usedSeconds += estimateExerciseSeconds(selectedTemplate, setsToAdd);
    usedTemplateIds.add(selectedTemplate.id);
    addressedMuscles.add(muscleGroup);
  }

  // Phase 2: Add more exercises with 2 sets before resorting to bonus sets
  // First pass: try new muscles not yet addressed
  let canAddMoreExercises = true;
  while (canAddMoreExercises) {
    canAddMoreExercises = false;

    for (const muscleGroup of rankedMuscles) {
      if (addressedMuscles.has(muscleGroup)) {
        continue;
      }

      const candidates = await findCandidates(muscleGroup);
      const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id));
      if (availableCandidates.length === 0) {
        continue;
      }

      let selectedTemplate = availableCandidates.find((t) => hasExerciseHistory(t.id));
      if (!selectedTemplate) {
        selectedTemplate = availableCandidates.sort((a, b) => {
          const aEquip = (a.equipment || 'other').toLowerCase();
          const bEquip = (b.equipment || 'other').toLowerCase();
          const aPreferred = aEquip === 'barbell' || aEquip === 'dumbbell' ? 0 : 1;
          const bPreferred = bEquip === 'barbell' || bEquip === 'dumbbell' ? 0 : 1;
          if (aPreferred !== bPreferred) return aPreferred - bPreferred;
          return availableCandidates.indexOf(a) - availableCandidates.indexOf(b);
        })[0]!;
      }

      const estSeconds = estimateExerciseSeconds(selectedTemplate, 2);
      if (usedSeconds + estSeconds <= availableSeconds) {
        const draftExercise = await buildDraftExercise(
          selectedTemplate,
          2,
          hasExerciseHistory(selectedTemplate.id),
          recency[muscleGroup]?.daysSinceTrained ?? null,
        );

        selectedExercises.push(draftExercise);
        usedSeconds += estSeconds;
        usedTemplateIds.add(selectedTemplate.id);
        addressedMuscles.add(muscleGroup);
        canAddMoreExercises = true;
        break;
      }
    }
  }

  // Second pass: add more exercises for already-addressed muscles (different exercises, same primary muscle)
  canAddMoreExercises = true;
  while (canAddMoreExercises) {
    canAddMoreExercises = false;

    for (const muscleGroup of rankedMuscles) {
      // This time, we DON'T skip addressed muscles - we want secondary exercises
      const candidates = await findCandidates(muscleGroup);
      const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id));
      if (availableCandidates.length === 0) {
        continue;
      }

      let selectedTemplate = availableCandidates.find((t) => hasExerciseHistory(t.id));
      if (!selectedTemplate) {
        selectedTemplate = availableCandidates.sort((a, b) => {
          const aEquip = (a.equipment || 'other').toLowerCase();
          const bEquip = (b.equipment || 'other').toLowerCase();
          const aPreferred = aEquip === 'barbell' || aEquip === 'dumbbell' ? 0 : 1;
          const bPreferred = bEquip === 'barbell' || bEquip === 'dumbbell' ? 0 : 1;
          if (aPreferred !== bPreferred) return aPreferred - bPreferred;
          return availableCandidates.indexOf(a) - availableCandidates.indexOf(b);
        })[0]!;
      }

      const estSeconds = estimateExerciseSeconds(selectedTemplate, 2);
      if (usedSeconds + estSeconds <= availableSeconds) {
        const draftExercise = await buildDraftExercise(
          selectedTemplate,
          2,
          hasExerciseHistory(selectedTemplate.id),
          recency[muscleGroup]?.daysSinceTrained ?? null,
        );

        selectedExercises.push(draftExercise);
        usedSeconds += estSeconds;
        usedTemplateIds.add(selectedTemplate.id);
        canAddMoreExercises = true;
        break;
      }
    }
  }

  // Phase 3: Distribute any remaining time as bonus sets (only after exercises exhausted)
  const remainingSeconds = availableSeconds - usedSeconds;
  const perSetIsolationSeconds = SECONDS_PER_SET.isolation;

  if (remainingSeconds >= perSetIsolationSeconds && selectedExercises.length > 0) {
    let bonusSetIndex = 0;
    let bonusSecsUsed = 0;
    let cyclesWithoutAddingSet = 0;

    while (bonusSecsUsed + perSetIsolationSeconds <= remainingSeconds) {
      const exercise = selectedExercises[bonusSetIndex];

      // Cap at 5 total sets per exercise
      if (exercise.sets < 5) {
        exercise.sets += 1;
        bonusSecsUsed += perSetIsolationSeconds;
        cyclesWithoutAddingSet = 0;
      } else {
        cyclesWithoutAddingSet++;
      }

      bonusSetIndex = (bonusSetIndex + 1) % selectedExercises.length;

      // Break if we've cycled through all exercises without adding a set
      if (cyclesWithoutAddingSet >= selectedExercises.length) {
        break;
      }
    }

    usedSeconds += bonusSecsUsed;
  }

  // Build summary
  let summary = 'Today\'s workout prioritizes muscle groups trained longest ago.';
  if (selectedExercises.length > 0 && workouts.length > 0) {
    // Find regions trained in most recent workout
    const lastWorkout = workouts[workouts.length - 1];
    const lastRegions = new Set<string>();
    for (const exercise of lastWorkout.exercises) {
      const template = templates.find((t) => t.id === exercise.exercise_template_id);
      if (template?.primary_muscle_group) {
        const region = MUSCLE_GROUP_REGION[template.primary_muscle_group];
        if (region) lastRegions.add(region);
      }
    }

    // Find regions in today's draft
    const draftRegions = new Set<string>();
    for (const exercise of selectedExercises) {
      if (exercise.primaryMuscleGroup) {
        const region = MUSCLE_GROUP_REGION[exercise.primaryMuscleGroup];
        if (region) draftRegions.add(region);
      }
    }

    // Build narrative
    const lastRegionsArray = Array.from(lastRegions).sort();
    const draftRegionsArray = Array.from(draftRegions).sort();

    if (lastRegionsArray.length > 0 && draftRegionsArray.length > 0) {
      const lastDesc = lastRegionsArray.join(' & ');
      const draftDesc = draftRegionsArray.join(' & ');

      if (lastDesc !== draftDesc) {
        summary = `Yesterday focused on ${lastDesc}. Today's draft emphasizes ${draftDesc}.`;
      }
    }
  }

  const estimatedMinutes = Math.ceil(usedSeconds / 60);

  // Add warmup and cooldown exercises if requested
  const finalExercises: DraftWorkoutExercise[] = [];

  if (includeWarmupCooldown) {
    finalExercises.push({
      exerciseTemplateId: 'warmup-placeholder',
      title: 'Warmup',
      primaryMuscleGroup: 'warmup',
      isNew: false,
      daysSinceTrained: null,
      sets: 1,
      targetRepsLow: 1,
      targetRepsHigh: 1,
      targetReps: 1,
      suggestedWeightKg: null,
    });
  }

  finalExercises.push(...selectedExercises);

  if (includeWarmupCooldown) {
    finalExercises.push({
      exerciseTemplateId: 'cooldown-placeholder',
      title: 'Stretching',
      primaryMuscleGroup: 'stretching',
      isNew: false,
      daysSinceTrained: null,
      sets: 1,
      targetRepsLow: 1,
      targetRepsHigh: 1,
      targetReps: 1,
      suggestedWeightKg: null,
    });
  }

  return {
    location,
    minutesAvailable,
    estimatedMinutes,
    summary,
    exercises: finalExercises,
  };
}
