import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB } from '../db/schema';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /auth/register — name + role + wallet_address (Freighter)
router.post('/register', async (req: Request, res: Response) => {
  const { name, role, wallet_address } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Ad soyad ve rol zorunlu' });
  if (!['client', 'freelancer'].includes(role)) return res.status(400).json({ error: 'Geçersiz rol' });
  if (!wallet_address) return res.status(400).json({ error: 'Freighter cüzdanı bağlanmadı' });

  const db = readDB();

  if (db.users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase()))
    return res.status(409).json({ error: 'Bu isimle zaten kayıtlı bir hesap var' });

  if (db.users.find(u => u.wallet_address && u.wallet_address === wallet_address))
    return res.status(409).json({ error: 'Bu cüzdan adresiyle zaten kayıtlı bir hesap var' });

  const user = {
    id: uuidv4(), name: name.trim(), wallet_address, role, balance_xlm: 0,
    total_earned: 0, total_spent: 0, reputation: 5.0, completed_jobs: 0,
    created_at: new Date().toISOString(),
  };
  db.users.push(user as any);
  writeDB(db);
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ token, user });
});

// POST /auth/login — name + wallet_address (Freighter)
// Demo login (no wallet_address) allowed only for accounts that have no wallet set
router.post('/login', async (req: Request, res: Response) => {
  const { name, wallet_address } = req.body;
  if (!name) return res.status(400).json({ error: 'Ad soyad zorunlu' });

  const db = readDB();
  const user = db.users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!user) return res.status(404).json({ error: 'Bu isimle kayıtlı hesap bulunamadı' });

  // Security check: if the account has a wallet, the provided wallet must match
  if (user.wallet_address && wallet_address && user.wallet_address !== wallet_address) {
    return res.status(401).json({ error: 'Cüzdan adresi bu hesapla eşleşmiyor' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  const { password: _, ...safe } = user as any;
  res.json({ token, user: safe });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  const { password: _, ...safe } = user as any;
  res.json(safe);
});

router.get('/transactions', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  const userJobs = db.jobs.filter(j => j.client_id === user.id || j.freelancer_id === user.id).map(j => j.id);
  const txs = db.transactions
    .filter(t => (t.job_id && userJobs.includes(t.job_id)) || t.from_address === user.wallet_address || t.to_address === user.wallet_address)
    .map(t => {
      const job = t.job_id ? db.jobs.find(j => j.id === t.job_id) : null;
      return { ...t, job_title: job?.title };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json(txs);
});

router.put('/wallet', authMiddleware, (req: AuthRequest, res: Response) => {
  const { wallet_address } = req.body;
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.user!.id);
  if (idx !== -1) db.users[idx].wallet_address = wallet_address;
  writeDB(db);
  res.json({ success: true });
});

export default router;
