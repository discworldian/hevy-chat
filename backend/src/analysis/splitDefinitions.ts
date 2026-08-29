export type SplitDay = 'push' | 'pull' | 'legs';

const SPLIT_MUSCLE_GROUPS: Record<SplitDay, string[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['lats', 'upper_back', 'traps', 'biceps', 'forearms'],
  legs: ['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back', 'adductors'],
};

export function getMuscleGroupsForSplit(splitDay: SplitDay): string[] {
  return SPLIT_MUSCLE_GROUPS[splitDay];
}

export function getOptionalMuscleGroups(): string[] {
  return ['abdominals'];
}
