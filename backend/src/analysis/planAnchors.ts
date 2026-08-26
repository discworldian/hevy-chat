import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');
const ANCHORS_FILE = join(DATA_DIR, 'plan_anchors.json');

interface PlanAnchors {
  [exerciseTemplateId: string]: { anchorDate: string };
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore if exists
  }
}

export async function readPlanAnchors(): Promise<PlanAnchors> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(ANCHORS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function writePlanAnchors(anchors: PlanAnchors): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ANCHORS_FILE, JSON.stringify(anchors, null, 2), 'utf-8');
}

export async function setAnchor(exerciseTemplateId: string, date: string): Promise<void> {
  const anchors = await readPlanAnchors();
  anchors[exerciseTemplateId] = { anchorDate: date };
  await writePlanAnchors(anchors);
}

export async function clearAnchor(exerciseTemplateId: string): Promise<void> {
  const anchors = await readPlanAnchors();
  delete anchors[exerciseTemplateId];
  await writePlanAnchors(anchors);
}

export async function getAnchor(exerciseTemplateId: string): Promise<string | null> {
  const anchors = await readPlanAnchors();
  return anchors[exerciseTemplateId]?.anchorDate || null;
}
