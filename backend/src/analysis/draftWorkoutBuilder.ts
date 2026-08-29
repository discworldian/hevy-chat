import type { Workout, ExerciseTemplate } from '../hevyTypes.js';
import type { Location } from '../equipment/equipmentTypes.js';
import type { Suggestion } from '../analysis/types.js';
import * as cache from '../cache.js';
import { analyzeExercise } from './exerciseAnalysis.js';
import { computeMuscleRecency, rankMuscleGroups } from './muscleGroups.js';
import { estimateExerciseSeconds, estimateDropSetExerciseSeconds, EXERCISE_SETUP_OVERHEAD_SECONDS, SECONDS_PER_SET } from './exerciseTimeEstimate.js';
import { canExerciseBePerformed } from '../equipment/exerciseEquipmentMap.js';
import { isCompoundExercise, roundToNearestIncrement, getIncrementForExercise } from './incrementTable.js';
import type { SplitDay } from './splitDefinitions.js';
import { getMuscleGroupsForSplit, getOptionalMuscleGroups } from './splitDefinitions.js';
import type { TrainingCycle } from './cycleManager.js';

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
  useDropSets?: boolean;
  includeWarmupSet?: boolean;
  warmupWeightKg?: number | null;
  warmupReps?: number;
}

export interface DraftWorkout {
  location: Location;
  minutesAvailable: number;
  estimatedMinutes: number;
  summary: string;
  exercises: DraftWorkoutExercise[];
  cycleInfo?: {
    cycleId: string;
    weekNumber: number;
    isFixed: boolean; // true if using cycle's fixed compounds
  };
}

type DraftWorkoutError = { status: 'time_too_short'; minMinutesNeeded: number };

export async function buildDraftWorkout(
  minutesAvailable: number,
  location: Location,
  splitDay: SplitDay,
  includeCardio: boolean = false,
  includeAbdominals: boolean = false,
  includeWarmupCooldown: boolean = false,
  cycle?: TrainingCycle | null,
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
    const isCompound = isCompoundExercise(template);

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

      // Calculate warm-up weight (50% of working weight) - only for weighted exercises
      const hasWeight = !!(suggestion.nextWeightKg && suggestion.nextWeightKg > 0);
      let warmupWeightKg: number | null = null;
      if (hasWeight) {
        const increment = getIncrementForExercise(template, isCompound);
        warmupWeightKg = roundToNearestIncrement(suggestion.nextWeightKg * 0.5, increment);
      }

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
        includeWarmupSet: isCompound && hasWeight,
        warmupWeightKg: isCompound && hasWeight ? warmupWeightKg : null,
        warmupReps: isCompound && hasWeight ? 10 : undefined,
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
        includeWarmupSet: false,
        warmupWeightKg: null,
        warmupReps: undefined,
      };
    }
  }

  // Helper to check if an exercise has been logged before
  function hasExerciseHistory(templateId: string): boolean {
    return workouts.some((w) => w.exercises.some((e) => e.exercise_template_id === templateId));
  }

  // Helper to categorize exercise by movement type
  function getMovementType(title: string): string {
    const lower = title.toLowerCase();
    if (/press|dip|push/i.test(lower)) return 'press';
    if (/row|pull|pulldown|lat/i.test(lower)) return 'row';
    if (/fly|pec deck|crossover/i.test(lower)) return 'fly';
    if (/curl|bicep/i.test(lower)) return 'curl';
    if (/extension|tricep|overhead/i.test(lower)) return 'extension';
    if (/raise|lateral|front/i.test(lower)) return 'raise';
    return 'other';
  }

  // Helper to check if exercise is too similar to already selected ones
  function isTooSimilar(template: ExerciseTemplate): boolean {
    const newMovementType = getMovementType(template.title);
    const newBaseTitle = template.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();
    let pressingMovements = 0;

    for (const selected of selectedExercises) {
      const selectedTemplate = templates.find((t) => t.id === selected.exerciseTemplateId);
      if (!selectedTemplate) continue;

      const selectedMovementType = getMovementType(selectedTemplate.title);
      const selectedBaseTitle = selectedTemplate.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();

      // Same exact movement (e.g., "Bench Press" variants)
      if (newBaseTitle === selectedBaseTitle) {
        return true;
      }

      // Too many pressing movements in one session (max 2 for compound focus)
      if (selectedMovementType === 'press') {
        pressingMovements++;
      }
      if (newMovementType === 'press' && pressingMovements >= 2) {
        return true;
      }

      // Same primary muscle AND same movement type (e.g., two different presses)
      if (
        template.primary_muscle_group === selectedTemplate.primary_muscle_group &&
        newMovementType === selectedMovementType &&
        newMovementType !== 'other'
      ) {
        return true;
      }
    }

    return false;
  }

  // Phase 0: If cycle is active, use its fixed compounds for this split day
  if (cycle && cycle.compoundExercises && splitDay in cycle.compoundExercises) {
    const cycleCompoundIds = cycle.compoundExercises[splitDay as keyof typeof cycle.compoundExercises];
    for (const compoundId of cycleCompoundIds) {
      if (usedTemplateIds.has(compoundId) || compoundsSelected >= MAX_COMPOUNDS) {
        continue;
      }

      const template = templates.find((t) => t.id === compoundId);
      if (!template) continue;

      // Estimate with warmup if compound
      const estSeconds = isCompoundExercise(template)
        ? estimateExerciseSeconds(template, 3)
        : estimateExerciseSeconds(template, 2);

      if (usedSeconds + estSeconds <= availableSeconds) {
        const daysSinceTrained = template.primary_muscle_group ? recency[template.primary_muscle_group]?.daysSinceTrained ?? null : null;

        const draftExercise = await buildDraftExercise(
          template,
          3,
          hasExerciseHistory(template.id),
          daysSinceTrained,
        );

        selectedExercises.push(draftExercise);
        usedSeconds += estSeconds;
        usedTemplateIds.add(template.id);

        // Mark all primary and secondary muscles as addressed
        if (template.primary_muscle_group) {
          addressedMuscles.add(template.primary_muscle_group);
        }

        compoundsSelected++;
      }
    }
  }

  // Phase 1a: Select 3-4 compounds first, prioritizing split-day muscles (if not using cycle)
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

    // Prioritize compounds over accessories in Phase 1a, skip similar exercises
    const compoundCandidates = availableCandidates.filter((t) => isCompoundExercise(t) && !isTooSimilar(t));
    const candidatePool = compoundCandidates.length > 0 ? compoundCandidates : availableCandidates.filter((t) => !isTooSimilar(t));

    if (candidatePool.length === 0) {
      continue; // No non-similar candidates
    }

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
    const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id) && !isTooSimilar(t));
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
      const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id) && !isTooSimilar(t));
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
      const availableCandidates = candidates.filter((t) => !usedTemplateIds.has(t.id) && !isTooSimilar(t));
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

  // Phase 4: Convert last 1-2 accessories to drop sets if over time budget
  if (usedSeconds > availableSeconds) {
    // Find accessories (non-compounds, excluding first 4 exercises which are likely compounds)
    const accessories = selectedExercises
      .slice(Math.min(4, selectedExercises.length)) // Skip first ~4 compounds
      .filter((ex) => {
        const template = templates.find((t) => t.id === ex.exerciseTemplateId);
        return template && !isCompoundExercise(template);
      });

    // Convert last 1-2 accessories to drop sets (1 working + 2 drops)
    let conversionsNeeded = Math.ceil((usedSeconds - availableSeconds) / 60); // roughly how many sets to save
    let conversionsMade = 0;

    for (let i = accessories.length - 1; i >= 0 && conversionsMade < 2; i--) {
      const accessory = accessories[i];
      if (accessory.sets < 3 || accessory.useDropSets) {
        continue; // Skip if already has drop sets or too few sets
      }

      // Calculate time savings: replace 3 regular sets with 1 working + 2 drop sets
      const oldTime = EXERCISE_SETUP_OVERHEAD_SECONDS + accessory.sets * SECONDS_PER_SET.isolation;
      const newTime = estimateDropSetExerciseSeconds(3); // 1 working + 2 drops = 3 total
      const timeSaved = oldTime - newTime;

      accessory.sets = 3; // 1 working + 2 drops (stored as 3 for display)
      accessory.useDropSets = true;
      usedSeconds -= timeSaved;
      conversionsMade++;

      if (usedSeconds <= availableSeconds) {
        break; // Done saving time
      }
    }
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
    ...(cycle && {
      cycleInfo: {
        cycleId: cycle.id,
        weekNumber: cycle.weekNumber,
        isFixed: cycle.compoundExercises[splitDay] && compoundsSelected > 0,
      },
    }),
  };
}
