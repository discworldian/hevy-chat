export type SplitDay = 'push' | 'pull' | 'legs';

export const ANY_DAY_MUSCLE_GROUPS = ['abdominals'];

const SPLIT_MUSCLE_GROUPS: Record<SplitDay, string[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['lats', 'upper_back', 'traps', 'biceps', 'forearms'],
  legs: ['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back', 'adductors'],
};

export function getMuscleGroupsForSplit(splitDay: SplitDay): string[] {
  return SPLIT_MUSCLE_GROUPS[splitDay];
}
