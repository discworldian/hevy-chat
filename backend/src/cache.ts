import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Workout, ExerciseTemplate } from './hevyTypes.js';
import * as hevyClient from './hevyClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');

interface WorkoutsCache {
  workouts: Workout[];
  lastSyncedAt: string | null;
}

interface TemplatesCache {
  templates: ExerciseTemplate[];
  fetchedAt: string;
}


let cacheLock = Promise.resolve();

function acquireLock<T>(fn: () => Promise<T>): Promise<T> {
  const oldLock = cacheLock;
  let releaseLock: () => void;
  const newLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  cacheLock = oldLock.then(() => newLock);

  return oldLock.then(async () => {
    try {
      return await fn();
    } finally {
      releaseLock!();
    }
  });
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore if exists
  }
}

export async function readWorkouts(): Promise<WorkoutsCache> {
  return acquireLock(async () => {
    await ensureDataDir();
    const path = join(DATA_DIR, 'workouts.json');
    try {
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { workouts: [], lastSyncedAt: null };
    }
  });
}

export async function writeWorkouts(cache: WorkoutsCache): Promise<void> {
  return acquireLock(async () => {
    await ensureDataDir();
    const path = join(DATA_DIR, 'workouts.json');
    await fs.writeFile(path, JSON.stringify(cache, null, 2), 'utf-8');
  });
}

export async function readTemplates(): Promise<TemplatesCache> {
  return acquireLock(async () => {
    await ensureDataDir();
    const path = join(DATA_DIR, 'exercise_templates.json');
    try {
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { templates: [], fetchedAt: new Date().toISOString() };
    }
  });
}

export async function writeTemplates(cache: TemplatesCache): Promise<void> {
  return acquireLock(async () => {
    await ensureDataDir();
    const path = join(DATA_DIR, 'exercise_templates.json');
    await fs.writeFile(path, JSON.stringify(cache, null, 2), 'utf-8');
  });
}


export async function refreshFromHevy(): Promise<{ synced: number; lastSyncedAt: string }> {
  return acquireLock(async () => {
    console.log('Starting cache refresh from Hevy...');

    // Fetch workouts with progress
    const count = await hevyClient.getWorkoutsCount();
    const pageSize = 10;
    const pages = Math.ceil(count / pageSize);
    const workouts: Workout[] = [];

    console.log(`Total workouts: ${count}, fetching ${pages} pages...`);

    for (let page = 1; page <= pages; page++) {
      const pageWorkouts = await hevyClient.listWorkouts(page, pageSize);
      workouts.push(...pageWorkouts);
      console.log(`  ✓ Fetched page ${page}/${pages} (${workouts.length} total so far)`);
    }

    // Fetch exercise templates
    console.log('Fetching exercise templates...');
    const templatePages = Math.ceil(200 / 100);
    const templates: ExerciseTemplate[] = [];
    for (let page = 1; page <= templatePages; page++) {
      try {
        const pageTemplates = await hevyClient.listExerciseTemplates(page, 100);
        templates.push(...pageTemplates);
        console.log(`  ✓ Fetched template page ${page}/${templatePages}`);
        if (pageTemplates.length < 100) break;
      } catch {
        break;
      }
    }

    const now = new Date().toISOString();

    // Write caches in background (don't wait)
    writeWorkouts({ workouts, lastSyncedAt: now }).catch((err) => console.error('Failed to write workouts:', err));
    writeTemplates({ templates, fetchedAt: now }).catch((err) => console.error('Failed to write templates:', err));

    console.log(
      `✓ Cache refresh complete: ${workouts.length} workouts, ${templates.length} templates`,
    );

    return { synced: workouts.length, lastSyncedAt: now };
  });
}
