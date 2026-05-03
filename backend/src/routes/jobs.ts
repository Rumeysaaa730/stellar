import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, pushNotification } from '../db/schema';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createEscrowAccount, generateDemoTxHash } from '../stellar/escrow';

const router = Router();

// GET /jobs
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const { role } = req.user!;
  const userId = req.user!.id;
  let jobs = db.jobs;

  const { status, category, my_jobs } = req.query as Record<string, string>;

  if (role === 'client') {
    // Clients only see their own jobs
    jobs = jobs.filter(j => j.client_id === userId);
  } else if (role === 'freelancer') {
    const AVAILABLE_STATUSES = ['open', 'CREATED', 'FUNDED'];
    if (my_jobs === 'true') {
      // Jobs I'm assigned to + jobs I applied to
      jobs = jobs.filter(j =>
        j.freelancer_id === userId ||
        (j.applicants?.includes(userId) && !j.freelancer_id)
      );
    } else {
      // All available jobs + my active/applied jobs
      jobs = jobs.filter(j =>
        (AVAILABLE_STATUSES.includes(j.status) && !j.freelancer_id) ||
        j.freelancer_id === userId ||
        j.applicants?.includes(userId)
      );
    }
  }
  // admin sees all — no filter

  if (status) jobs = jobs.filter(j => j.status === status);
  if (category) jobs = jobs.filter(j => j.category === category);

  const enriched = jobs
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(j => enrichJob(j, db, userId));
  res.json(enriched);
});

// GET /jobs/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const job = db.jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });
  const dispute = db.disputes.find(d => d.job_id === job.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched: any = enrichJob(job, db, req.user!.id);
  if (dispute) {
    enriched.dispute_id = dispute.id;
    enriched.dispute_status = dispute.status;
    enriched.dispute_reason = dispute.reason;
    enriched.dispute_desc = dispute.description;
    enriched.dispute_resolution = dispute.resolution;
    enriched.dispute_opened_at = dispute.opened_at;
  }
  res.json(enriched);
});

// POST /jobs — create job (client only)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'client')
    return res.status(403).json({ error: 'Sadece müşteriler iş oluşturabilir' });

  const { title, description, budget_xlm, category, freelancer_address, delivery_days, attachment } = req.body;

  // Validation
  if (!title || !description || !budget_xlm || !category || !freelancer_address || !delivery_days)
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });

  if (title.length < 5 || title.length > 100)
    return res.status(400).json({ error: 'Başlık 5-100 karakter olmalı' });

  if (description.length < 20 || description.length > 1000)
    return res.status(400).json({ error: 'Açıklama 20-1000 karakter olmalı' });

  const budget = parseFloat(budget_xlm);
  if (isNaN(budget) || budget < 1)
    return res.status(400).json({ error: '⚠️ Minimum 1 XLM yatırabilirsiniz' });
  if (budget > 1_000_000)
    return res.status(400).json({ error: '⚠️ Maksimum 1.000.000 XLM yatırabilirsiniz' });

  if (!freelancer_address.startsWith('G') || freelancer_address.length !== 56)
    return res.status(400).json({ error: 'Geçerli bir Stellar adresi girin (G ile başlamalı, 56 karakter)' });

  const validDays = [3, 7, 14, 30];
  const days = parseInt(delivery_days);
  if (!validDays.includes(days))
    return res.status(400).json({ error: 'Geçersiz teslim süresi' });

  const db = readDB();

  // Find freelancer by wallet address
  const freelancer = db.users.find(u => u.wallet_address === freelancer_address && u.role === 'freelancer');

  // Calculate deadline from delivery_days
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);

  const escrow = await createEscrowAccount();
  const job: any = {
    id: uuidv4(), title: title.trim(), description: description.trim(),
    budget_xlm: budget,
    client_id: req.user!.id,
    freelancer_id: freelancer?.id,
    intended_freelancer_wallet: freelancer_address,
    status: 'CREATED', category,
    deadline: deadline.toISOString(),
    escrow_account: escrow.publicKey,
    escrow_secret: escrow.secretKey,
    escrow_funded: false,
    commission_xlm: budget * 0.01,
    applicants: [],
    ...(attachment ? { attachment } : {}),
    created_at: new Date().toISOString(),
  };

  db.jobs.push(job);

  // If freelancer found, notify them
  if (freelancer) {
    pushNotification(
      db, freelancer.id, 'job_accepted',
      `"${title}" işi için size escrow oluşturuldu. Escrow finanse edilince başlayabilirsiniz.`,
      `/jobs/${job.id}`
    );
  }

  writeDB(db);
  const { escrow_secret: _, ...safe } = job;
  res.status(201).json(safe);
});

// POST /jobs/:id/fund — client funds escrow
router.post('/:id/fund', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'Yetkisiz' });
  const { tx_hash, from_address } = req.body;
  const db = readDB();
  const idx = db.jobs.findIndex(j => j.id === req.params.id && j.client_id === req.user!.id);
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı' });
  db.jobs[idx].escrow_funded = true;
  db.jobs[idx].status = 'FUNDED';
  db.transactions.push({
    id: uuidv4(), job_id: req.params.id,
    from_address: from_address || 'wallet',
    to_address: db.jobs[idx].escrow_account,
    amount_xlm: db.jobs[idx].budget_xlm, type: 'escrow_fund',
    stellar_tx_hash: tx_hash || generateDemoTxHash(), status: 'completed',
    created_at: new Date().toISOString(),
  });
  writeDB(db);
  res.json({ success: true });
});

// POST /jobs/:id/apply — freelancer applies (adds to applicants list)
router.post('/:id/apply', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'freelancer')
    return res.status(403).json({ error: 'Sadece freelancer başvurabilir' });
  const db = readDB();
  const idx = db.jobs.findIndex(
    j => j.id === req.params.id &&
    ['open', 'CREATED', 'FUNDED'].includes(j.status) &&
    !j.freelancer_id
  );
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı veya uygun değil' });
  const job = db.jobs[idx];

  if (!db.jobs[idx].applicants) db.jobs[idx].applicants = [];
  if (db.jobs[idx].applicants!.includes(req.user!.id))
    return res.status(409).json({ error: 'Zaten başvurdunuz' });

  db.jobs[idx].applicants!.push(req.user!.id);

  // Notify client with freelancer name
  const freelancer = db.users.find(u => u.id === req.user!.id);
  pushNotification(
    db, job.client_id, 'job_applied',
    `"${job.title}" işine ${freelancer?.name || 'Bir freelancer'} başvurdu.`,
    `/jobs/${job.id}`
  );

  writeDB(db);
  res.json({ success: true });
});

// POST /jobs/:id/accept/:freelancerId — client accepts a freelancer
router.post('/:id/accept/:freelancerId', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'Yetkisiz' });
  const db = readDB();
  const idx = db.jobs.findIndex(
    j => j.id === req.params.id && j.client_id === req.user!.id && !j.freelancer_id
  );
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı veya zaten atanmış' });
  const freelancer = db.users.find(u => u.id === req.params.freelancerId);
  if (!freelancer) return res.status(404).json({ error: 'Freelancer bulunamadı' });

  db.jobs[idx].freelancer_id = req.params.freelancerId;
  db.jobs[idx].status = 'IN_PROGRESS';

  // Notify accepted freelancer
  pushNotification(
    db, req.params.freelancerId, 'job_accepted',
    `"${db.jobs[idx].title}" işine kabul edildiniz! Çalışmaya başlayabilirsiniz.`,
    `/jobs/${req.params.id}`
  );

  // Notify rejected applicants
  const rejected = (db.jobs[idx].applicants || []).filter(id => id !== req.params.freelancerId);
  for (const rid of rejected) {
    pushNotification(
      db, rid, 'job_rejected',
      `"${db.jobs[idx].title}" işi başka bir freelancer'a verildi.`,
      `/jobs/${req.params.id}`
    );
  }

  writeDB(db);
  res.json({ success: true });
});

// POST /jobs/:id/submit — freelancer submits work
router.post('/:id/submit', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'freelancer') return res.status(403).json({ error: 'Yetkisiz' });
  const { delivery_note } = req.body;
  const db = readDB();
  const idx = db.jobs.findIndex(
    j => j.id === req.params.id &&
      j.freelancer_id === req.user!.id &&
      (j.status === 'IN_PROGRESS' || j.status === 'in_progress')
  );
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı' });
  const job = db.jobs[idx];
  db.jobs[idx].status = 'SUBMITTED';
  db.jobs[idx].delivery_note = delivery_note || '';
  db.jobs[idx].delivered_at = new Date().toISOString();

  // Notify client
  pushNotification(
    db, job.client_id, 'job_submitted',
    `"${job.title}" işi teslim edildi. Lütfen inceleyin.`,
    `/jobs/${job.id}`
  );

  writeDB(db);
  res.json({ success: true });
});

// Legacy: POST /jobs/:id/deliver — kept for backwards compat
router.post('/:id/deliver', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'freelancer') return res.status(403).json({ error: 'Yetkisiz' });
  const { delivery_note } = req.body;
  const db = readDB();
  const idx = db.jobs.findIndex(
    j => j.id === req.params.id &&
      j.freelancer_id === req.user!.id &&
      (j.status === 'in_progress' || j.status === 'IN_PROGRESS')
  );
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı' });
  const job = db.jobs[idx];
  db.jobs[idx].status = 'SUBMITTED';
  db.jobs[idx].delivery_note = delivery_note || '';
  db.jobs[idx].delivered_at = new Date().toISOString();

  pushNotification(
    db, job.client_id, 'job_submitted',
    `"${job.title}" işi teslim edildi. Lütfen inceleyin.`,
    `/jobs/${job.id}`
  );

  writeDB(db);
  res.json({ success: true });
});

// POST /jobs/:id/approve — client approves work, payment released
router.post('/:id/approve', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'Yetkisiz' });
  const db = readDB();
  const idx = db.jobs.findIndex(
    j => j.id === req.params.id &&
      j.client_id === req.user!.id &&
      (j.status === 'SUBMITTED' || j.status === 'delivered' || j.status === 'APPROVED')
  );
  if (idx === -1) return res.status(404).json({ error: 'İş bulunamadı' });
  const job = db.jobs[idx];
  if (!job.freelancer_id) return res.status(400).json({ error: 'Freelancer atanmamış' });
  const commission = job.budget_xlm * 0.01;
  const payment = job.budget_xlm - commission;
  const txHash = generateDemoTxHash();

  db.jobs[idx].status = 'COMPLETED';
  db.jobs[idx].completed_at = new Date().toISOString();

  const flIdx = db.users.findIndex(u => u.id === job.freelancer_id);
  if (flIdx !== -1) {
    db.users[flIdx].total_earned += payment;
    db.users[flIdx].completed_jobs += 1;
  }
  const clIdx = db.users.findIndex(u => u.id === req.user!.id);
  if (clIdx !== -1) db.users[clIdx].total_spent += job.budget_xlm;

  db.transactions.push({
    id: uuidv4(), job_id: req.params.id, from_address: job.escrow_account,
    to_address: db.users.find(u => u.id === job.freelancer_id)?.wallet_address,
    amount_xlm: payment, type: 'release_payment', stellar_tx_hash: txHash,
    status: 'completed', created_at: new Date().toISOString(),
  });

  // Notify freelancer
  pushNotification(
    db, job.freelancer_id, 'payment_released',
    `"${job.title}" işi onaylandı! ${payment.toFixed(2)} XLM ödemeniz serbest bırakıldı.`,
    `/jobs/${job.id}`
  );

  writeDB(db);
  res.json({ success: true, tx_hash: txHash, payment_amount: payment, commission });
});

// POST /jobs/:id/dispute — open dispute
router.post('/:id/dispute', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'Sadece müşteriler itiraz açabilir' });
  const { reason, description } = req.body;
  if (!reason || !description) return res.status(400).json({ error: 'Sebep ve açıklama gerekli' });
  if (!['not_delivered', 'bad_quality', 'incomplete', 'poor_quality'].includes(reason))
    return res.status(400).json({ error: 'Geçersiz sebep' });

  const db = readDB();
  const job = db.jobs.find(j => j.id === req.params.id && j.client_id === req.user!.id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });
  if (!['SUBMITTED', 'IN_PROGRESS', 'delivered', 'in_progress', 'FUNDED'].includes(job.status))
    return res.status(400).json({ error: 'Bu iş için itiraz açılamaz' });
  if (db.disputes.find(d => d.job_id === req.params.id))
    return res.status(409).json({ error: 'Bu iş için zaten bir itiraz mevcut' });

  const dispute = {
    id: uuidv4(), job_id: req.params.id, opened_by: req.user!.id,
    reason, description, status: 'OPEN', opened_at: new Date().toISOString(),
  };
  db.disputes.push(dispute);

  const jIdx = db.jobs.findIndex(j => j.id === req.params.id);
  if (jIdx !== -1) db.jobs[jIdx].status = 'DISPUTED';

  // Notify freelancer if assigned
  if (job.freelancer_id) {
    pushNotification(
      db, job.freelancer_id, 'dispute_opened',
      `"${job.title}" işi için itiraz açıldı.`,
      `/disputes/${dispute.id}`
    );
  }

  writeDB(db);
  res.status(201).json({ id: dispute.id, success: true });
});

// GET /jobs/:id/transactions
router.get('/:id/transactions', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  res.json(
    db.transactions
      .filter(t => t.job_id === req.params.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichJob(job: any, db: ReturnType<typeof readDB>, requesterId?: string) {
  const client = db.users.find(u => u.id === job.client_id);
  const freelancer = job.freelancer_id ? db.users.find(u => u.id === job.freelancer_id) : null;
  const { escrow_secret: _, ...safe } = job;

  // Enrich applicants with their names/reputations
  const applicantDetails = (job.applicants || []).map((id: string) => {
    const u = db.users.find(u => u.id === id);
    return u ? { id: u.id, name: u.name, reputation: u.reputation, completed_jobs: u.completed_jobs } : { id };
  });

  return {
    ...safe,
    client_name: client?.name,
    client_wallet: client?.wallet_address,
    freelancer_name: freelancer?.name,
    freelancer_wallet: freelancer?.wallet_address,
    freelancer_reputation: freelancer?.reputation,
    applicant_details: applicantDetails,
    applicant_count: applicantDetails.length,
    has_applied: requesterId ? (job.applicants || []).includes(requesterId) : false,
  };
}

export default router;
