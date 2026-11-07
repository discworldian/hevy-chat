import { Router, type Request, type Response } from 'express';
import { EQUIPMENT_TYPES, type EquipmentItem, type Location } from '../equipment/equipmentTypes.js';
import { getEquipmentForLocation, updateHomeEquipment } from '../equipment/equipmentProfile.js';

const router = Router();

// Returns an error message for the first invalid item, or null if all items are valid.
function validateEquipmentItems(items: unknown[]): string | null {
  const ids = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') return `items[${i}] must be an object`;
    if (typeof item.id !== 'string' || !item.id) return `items[${i}].id must be a non-empty string`;
    if (ids.has(item.id)) return `items[${i}].id "${item.id}" is duplicated`;
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim()) return `items[${i}].name must be a non-empty string`;
    if (!(EQUIPMENT_TYPES as readonly string[]).includes(item.type as string)) {
      return `items[${i}].type must be one of: ${EQUIPMENT_TYPES.join(', ')}`;
    }
    for (const field of ['minWeightKg', 'maxWeightKg', 'increment'] as const) {
      const value = item[field];
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
        return `items[${i}].${field} must be a non-negative number when provided`;
      }
    }
    if (item.minWeightKg !== undefined && item.maxWeightKg !== undefined &&
        (item.minWeightKg as number) > (item.maxWeightKg as number)) {
      return `items[${i}].minWeightKg cannot be greater than maxWeightKg`;
    }
    if (item.notes !== undefined && typeof item.notes !== 'string') {
      return `items[${i}].notes must be a string when provided`;
    }
  }
  return null;
}

router.get('/:location', async (req: Request, res: Response) => {
  try {
    const { location } = req.params as { location: Location };
    const equipment = await getEquipmentForLocation(location);
    res.json({ location, equipment });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

router.put('/home', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const validationError = validateEquipmentItems(items);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const validItems = items as EquipmentItem[];
    await updateHomeEquipment(validItems);
    res.json({ success: true, equipment: validItems });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
