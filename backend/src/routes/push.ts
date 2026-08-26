import { Router, type Request, type Response } from 'express';

const router = Router();

// Stub routes for push flow — to be fully implemented
router.post('/preview', async (req: Request, res: Response) => {
  res.json({ message: 'Preview not yet implemented' });
});

router.post('/confirm', async (req: Request, res: Response) => {
  res.json({ message: 'Confirm not yet implemented' });
});

export default router;
