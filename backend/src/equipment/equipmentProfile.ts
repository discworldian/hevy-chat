import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EquipmentProfile, Location, EquipmentItem } from './equipmentTypes.js';
import { GYM_DEFAULT_EQUIPMENT } from './gymDefaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../data');
const EQUIPMENT_FILE = join(DATA_DIR, 'equipment_profile.json');

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore if exists
  }
}

export async function readEquipmentProfile(): Promise<EquipmentProfile> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(EQUIPMENT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { home: [] };
  }
}

export async function writeEquipmentProfile(profile: EquipmentProfile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(EQUIPMENT_FILE, JSON.stringify(profile, null, 2), 'utf-8');
}

export async function getEquipmentForLocation(location: Location): Promise<EquipmentItem[]> {
  const profile = await readEquipmentProfile();

  if (location === 'home') {
    return profile.home;
  } else if (location === 'gym') {
    // Gym = home + defaults
    const homeIds = new Set(profile.home.map((e) => e.id));
    const defaultsNotInHome = GYM_DEFAULT_EQUIPMENT.filter((e) => !homeIds.has(e.id));
    return [...profile.home, ...defaultsNotInHome];
  }

  return [];
}

export async function updateHomeEquipment(items: EquipmentItem[]): Promise<void> {
  const profile: EquipmentProfile = { home: items };
  await writeEquipmentProfile(profile);
}
