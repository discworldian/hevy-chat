import { Router, type Request, type Response } from 'express';
import * as hevyClient from '../hevyClient.js';

const router = Router();

router.get('/info', async (req: Request, res: Response) => {
  try {
    const userInfo = await hevyClient.getUserInfo();
    res.json(userInfo);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, retryable: err.retryable });
  }
});

router.get('/debug/workouts-count', async (req: Request, res: Response) => {
  try {
    const count = await hevyClient.getWorkoutsCount();
    res.json({ count, message: `Total workouts: ${count}` });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, retryable: err.retryable });
  }
});

export default router;
