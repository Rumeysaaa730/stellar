import { Router, Response } from 'express';
import { readDB, writeDB } from '../db/schema';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /notifications — get user notifications
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const notifications = db.notifications
    .filter(n => n.user_id === req.user!.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
  res.json(notifications);
});

// PUT /notifications/:id/read — mark single notification as read
router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const idx = db.notifications.findIndex(
    n => n.id === req.params.id && n.user_id === req.user!.id
  );
  if (idx === -1) return res.status(404).json({ error: 'Bildirim bulunamadı' });
  db.notifications[idx].read = true;
  writeDB(db);
  res.json({ success: true });
});

// PUT /notifications/read-all — mark all as read
router.put('/read-all', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  db.notifications
    .filter(n => n.user_id === req.user!.id)
    .forEach(n => { n.read = true; });
  writeDB(db);
  res.json({ success: true });
});

export default router;
