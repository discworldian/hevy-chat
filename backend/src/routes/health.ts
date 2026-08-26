import { Router } from 'express';
import { getConfig } from '../config.js';
import * as hevyClient from '../hevyClient.js';

const router = Router();

router.get('/', async (req, res) => {
  const config = getConfig();
  const hevyKeyPresent = !!config.HEVY_API_KEY;

  let hevyKeyValid: boolean | null = null;

  if (hevyKeyPresent) {
    try {
      await hevyClient.getUserInfo();
      hevyKeyValid = true;
    } catch (err) {
      hevyKeyValid = false;
    }
  }

  res.json({
    ok: hevyKeyPresent && hevyKeyValid,
    hevyKeyPresent,
    hevyKeyValid,
  });
});

export default router;
