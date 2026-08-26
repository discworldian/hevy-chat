import { Router, type Request, type Response } from 'express';
import type { Location } from '../equipment/equipmentTypes.js';
import { getEquipmentForLocation, updateHomeEquipment } from '../equipment/equipmentProfile.js';

const router = Router();

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
    await updateHomeEquipment(items);
    res.json({ success: true, equipment: items });
  } catch (err: any) {
    res.status(500).json({ error: err.message, retryable: true });
  }
});

export default router;
