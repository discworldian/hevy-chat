import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');
const SETTINGS_FILE = join(DATA_DIR, 'training_settings.json');

export interface TrainingSettings {
  weeklyFrequencyTarget: number;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore if exists
  }
}

export async function readTrainingSettings(): Promise<TrainingSettings> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { weeklyFrequencyTarget: 4 };
  }
}

export async function writeTrainingSettings(settings: TrainingSettings): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
