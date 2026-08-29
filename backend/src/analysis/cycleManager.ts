import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SplitDay } from './splitDefinitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const cycleFile = path.join(dataDir, 'training_cycle.json');

export interface TrainingCycle {
  id: string;
  startDate: string; // ISO date
  endDate: string | null; // null = active
  weekNumber: number; // 1-8, derived from startDate
  compoundExercises: Record<SplitDay, string[]>; // template IDs
  accessoryRotationWeek: number; // tracks when accessories last rotated
}

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {
    // directory already exists
  }
}

async function readCycleFile(): Promise<TrainingCycle | null> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(cycleFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeCycleFile(cycle: TrainingCycle): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(cycleFile, JSON.stringify(cycle, null, 2));
}

export function calculateCycleWeekNumber(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  return Math.min(Math.max(weekNumber, 1), 8);
}

export async function getCurrentCycle(): Promise<TrainingCycle | null> {
  const cycle = await readCycleFile();
  if (!cycle || cycle.endDate) {
    return null; // No active cycle
  }
  // Update weekNumber based on current date
  return {
    ...cycle,
    weekNumber: calculateCycleWeekNumber(cycle.startDate),
  };
}

export async function startNewCycle(
  compoundExercises: Record<SplitDay, string[]>,
): Promise<TrainingCycle> {
  const currentCycle = await readCycleFile();

  // Archive current cycle if active
  if (currentCycle && !currentCycle.endDate) {
    const archived = {
      ...currentCycle,
      endDate: new Date().toISOString().split('T')[0],
    };
    // In a more complete implementation, store archived cycles in a separate file
  }

  const newCycle: TrainingCycle = {
    id: `cycle-${Date.now()}`,
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    weekNumber: 1,
    compoundExercises,
    accessoryRotationWeek: 0,
  };

  await writeCycleFile(newCycle);
  return newCycle;
}

export async function shouldRotateAccessories(
  rotationIntervalWeeks: number = 3,
): Promise<boolean> {
  const cycle = await getCurrentCycle();
  if (!cycle) return false;

  const weeksSinceRotation = cycle.weekNumber - cycle.accessoryRotationWeek;
  return weeksSinceRotation >= rotationIntervalWeeks;
}

export async function recordAccessoryRotation(): Promise<void> {
  const cycle = await getCurrentCycle();
  if (!cycle) return;

  const updated = {
    ...cycle,
    accessoryRotationWeek: cycle.weekNumber,
  };

  await writeCycleFile(updated);
}

export async function getCycleProgress(): Promise<{
  cycleId: string;
  weekNumber: number;
  weekPercentage: number;
  daysRemaining: number;
} | null> {
  const cycle = await getCurrentCycle();
  if (!cycle) return null;

  const start = new Date(cycle.startDate);
  const cycleEnd = new Date(start);
  cycleEnd.setDate(cycleEnd.getDate() + 56); // 8 weeks

  const now = new Date();
  const daysRemaining = Math.max(0, Math.floor((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const weekPercentage = ((cycle.weekNumber - 1) / 8) * 100;

  return {
    cycleId: cycle.id,
    weekNumber: cycle.weekNumber,
    weekPercentage,
    daysRemaining,
  };
}
