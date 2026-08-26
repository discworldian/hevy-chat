import type { ExerciseTemplate } from '../hevyTypes.js';
import type { EquipmentItem, Location } from './equipmentTypes.js';
import { getEquipmentForLocation } from './equipmentProfile.js';

export const EXERCISE_EQUIPMENT_OVERRIDES: Record<string, string[]> = {
  // Format: exerciseTemplateId or exercise name -> list of required equipment IDs or keywords
  // Example:
  // "Dumbbell Bench Press": ["dumbbell"],
  // "Leg Press": ["gym-leg-press"],
};

function getRequiredEquipment(exercise: ExerciseTemplate): string[] {
  // Check override first
  if (EXERCISE_EQUIPMENT_OVERRIDES[exercise.id]) {
    return EXERCISE_EQUIPMENT_OVERRIDES[exercise.id];
  }

  if (EXERCISE_EQUIPMENT_OVERRIDES[exercise.title]) {
    return EXERCISE_EQUIPMENT_OVERRIDES[exercise.title];
  }

  // Use Hevy's real equipment field for reliable buckets, fall back to heuristic for "machine"
  if (exercise.equipment) {
    const equipLower = exercise.equipment.toLowerCase();

    // Reliable Hevy buckets (use directly)
    if (equipLower === 'dumbbell') return ['dumbbell'];
    if (equipLower === 'barbell') return ['barbell'];
    if (equipLower === 'kettlebell') return ['kettlebell'];
    if (equipLower === 'resistance_band' || equipLower === 'band') return ['band'];
    if (equipLower === 'none') return ['bodyweight'];

    // For "machine" and other coarse buckets, fall through to heuristic
    // since the title patterns distinguish specific machine types better
  }

  // Heuristic: infer from title
  const titleLower = exercise.title.toLowerCase();

  const requirements: string[] = [];

  if (titleLower.includes('dumbbell')) requirements.push('dumbbell');
  if (titleLower.includes('barbell') || titleLower.includes('squat') || titleLower.includes('deadlift') || titleLower.includes('bench press')) requirements.push('barbell');
  if (titleLower.includes('cable')) requirements.push('cable');
  if (titleLower.includes('leg press')) requirements.push('leg-press');
  if (titleLower.includes('leg extension')) requirements.push('leg-extension');
  if (titleLower.includes('leg curl')) requirements.push('leg-curl');
  if (titleLower.includes('lat pulldown')) requirements.push('lat-pulldown');
  if (titleLower.includes('row')) requirements.push('machine-row');
  if (titleLower.includes('pullup') || titleLower.includes('pull-up')) requirements.push('pull-up-bar');
  if (titleLower.includes('dip')) requirements.push('dip-station');
  if (titleLower.includes('kettlebell')) requirements.push('kettlebell');
  if (titleLower.includes('band') || titleLower.includes('resistance')) requirements.push('band');

  // If no equipment inferred, assume it can be done with dumbbells or bodyweight
  if (requirements.length === 0) {
    if (titleLower.includes('press') || titleLower.includes('fly') || titleLower.includes('raise')) {
      requirements.push('dumbbell');
    } else {
      requirements.push('bodyweight'); // generic fallback
    }
  }

  return requirements;
}

function matchesEquipmentRequirement(requirement: string, equipment: EquipmentItem): boolean {
  const eqTypeLower = equipment.type.toLowerCase();
  const nameLower = equipment.name.toLowerCase();

  // Exact matches
  if (eqTypeLower === requirement) return true;
  if (nameLower.includes(requirement)) return true;
  if (equipment.id.includes(requirement)) return true;

  // Loose matches
  if (requirement === 'barbell' && (eqTypeLower === 'bar' || nameLower.includes('barbell'))) return true;
  if (requirement === 'pullup' && (nameLower.includes('pull') || nameLower.includes('chin'))) return true;
  if (requirement === 'dip' && nameLower.includes('dip')) return true;
  if (requirement === 'leg-press' && nameLower.includes('leg press')) return true;
  if (requirement === 'leg-extension' && nameLower.includes('leg extension')) return true;
  if (requirement === 'leg-curl' && nameLower.includes('leg curl')) return true;
  if (requirement === 'lat-pulldown' && nameLower.includes('lat pulldown')) return true;
  if (requirement === 'machine-row' && nameLower.includes('row')) return true;
  if (requirement === 'pull-up-bar' && nameLower.includes('pull')) return true;
  if (requirement === 'bodyweight') return true; // Always available

  return false;
}

export async function canExerciseBePerformed(
  exercise: ExerciseTemplate,
  location: Location,
): Promise<{ available: boolean; missingEquipment: string[] }> {
  const requirements = getRequiredEquipment(exercise);
  const availableEquipment = await getEquipmentForLocation(location);

  const missing: string[] = [];

  for (const req of requirements) {
    if (req === 'bodyweight') continue; // always available

    const hasEquipment = availableEquipment.some((eq) => matchesEquipmentRequirement(req, eq));
    if (!hasEquipment) {
      missing.push(req);
    }
  }

  return {
    available: missing.length === 0,
    missingEquipment: missing,
  };
}
