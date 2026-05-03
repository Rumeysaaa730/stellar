import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, pushNotification } from '../db/schema';
import { adminMiddleware, AuthRequest } from '../middleware/auth';
import { generateDemoTxHash } from '../stellar/escrow';

const router = Router();

// GET /admin/stats
router.get('/stats', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const jobs = db.jobs;
  const txs = db.transactions;

  const reportedUserIds = new Set<string>();
  db.disputes.forEach(d => {
    const job = db.jobs.find(j => j.id === d.job_id);
    if (!job) return;
    if (job.client_id === d.opened_by && job.freelancer_id) reportedUserIds.add(job.freelancer_id);
    else if (job.client_id !== d.opened_by) reportedUserIds.add(job.client_id);
  });

  const stats = {
    total_users: db.users.filter(u => u.role !== 'admin').length,
    total_clients: db.users.filter(u => u.role === 'client').length,
    total_freelancers: db.users.filter(u => u.role === 'freelancer').length,
    total_jobs: jobs.length,
    open_jobs: jobs.filter(j => ['open', 'CREATED', 'FUNDED'].includes(j.status)).length,
    in_progress_jobs: jobs.filter(j => ['in_progress', 'IN_PROGRESS'].includes(j.status)).length,
    completed_jobs: jobs.filter(j => ['completed', 'COMPLETED'].includes(j.status)).length,
    disputed_jobs: jobs.filter(j => ['disputed', 'DISPUTED'].includes(j.status)).length,
    submitted_jobs: jobs.filter(j => ['delivered', 'SUBMITTED'].includes(j.status)).length,
    open_disputes: db.disputes.filter(d => ['open', 'OPEN', 'REVIEWING'].includes(d.status)).length,
    reported_users: reportedUserIds.size,
    total_volume_xlm: jobs
      .filter(j => ['completed', 'COMPLETED'].includes(j.status))
      .reduce((s, j) => s + j.budget_xlm, 0),
    commission_earned: jobs
      .filter(j => ['completed', 'COMPLETED'].includes(j.status))
      .reduce((s, j) => s + (j.commission_xlm || 0), 0),
    recent_transactions: txs
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10),
  };
  res.json(stats);
});

// GET /admin/users
router.get('/users', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  res.json(
    db.users
      .map(u => { const copy = { ...u } as Record<string, unknown>; delete copy.password; return copy; })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        (b.created_at as string).localeCompare(a.created_at as string))
  );
});

// GET /admin/jobs
router.get('/jobs', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const enriched = db.jobs
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(j => {
      const client = db.users.find(u => u.id === j.client_id);
      const freelancer = j.freelancer_id ? db.users.find(u => u.id === j.freelancer_id) : null;
      const { escrow_secret: _, ...safe } = j;
      return { ...safe, client_name: client?.name, freelancer_name: freelancer?.name };
    });
  res.json(enriched);
});

// GET /admin/disputes
router.get('/disputes', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const enriched = db.disputes
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at))
    .map(d => {
      const job = db.jobs.find(j => j.id === d.job_id);
      const client = job ? db.users.find(u => u.id === job.client_id) : null;
      const freelancer = job?.freelancer_id ? db.users.find(u => u.id === job.freelancer_id) : null;
      const opener = db.users.find(u => u.id === d.opened_by);
      return {
        ...d, job_title: job?.title, budget_xlm: job?.budget_xlm,
        client_name: client?.name, freelancer_name: freelancer?.name,
        client_wallet: client?.wallet_address, freelancer_wallet: freelancer?.wallet_address,
        opened_by_name: opener?.name, opened_by_role: opener?.role,
      };
    });
  res.json(enriched);
});

// POST /admin/disputes/:id/notify — send status notification to both parties
router.post('/disputes/:id/notify', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const dispute = db.disputes.find(d => d.id === req.params.id);
  if (!dispute) return res.status(404).json({ error: 'İtiraz bulunamadı' });
  const job = db.jobs.find(j => j.id === dispute.job_id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });

  const msg = `"${job.title}" itirazınız admin tarafından inceleniyor. Kısa sürede bilgilendirileceksiniz.`;
  if (job.freelancer_id) {
    pushNotification(db, job.freelancer_id, 'dispute_opened', msg, `/disputes/${dispute.id}`);
  }
  pushNotification(db, job.client_id, 'dispute_opened', msg, `/disputes/${dispute.id}`);

  writeDB(db);
  res.json({ success: true });
});

// POST /admin/disputes/:id/resolve
router.post('/disputes/:id/resolve', adminMiddleware, (req: AuthRequest, res: Response) => {
  const { resolution, partial_percent } = req.body;
  if (!['freelancer', 'client', 'partial', 'pay_freelancer', 'refund_client', 'split'].includes(resolution))
    return res.status(400).json({ error: 'Geçersiz karar' });

  const db = readDB();
  const dIdx = db.disputes.findIndex(d => d.id === req.params.id);
  if (dIdx === -1) return res.status(404).json({ error: 'İtiraz bulunamadı' });
  if (['RESOLVED', 'resolved'].includes(db.disputes[dIdx].status))
    return res.status(400).json({ error: 'Zaten çözüldü' });

  const dispute = db.disputes[dIdx];
  const job = db.jobs.find(j => j.id === dispute.job_id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });

  const normalizedResolution =
    resolution === 'pay_freelancer' ? 'freelancer' :
    resolution === 'refund_client' ? 'client' :
    resolution === 'split' ? 'partial' : resolution;

  const budget = job.budget_xlm;
  const commission = budget * 0.01;
  let freelancerAmount = 0;
  let clientRefund = 0;
  let newJobStatus = 'CANCELLED';

  if (normalizedResolution === 'freelancer') {
    freelancerAmount = budget - commission;
    newJobStatus = 'COMPLETED';
  } else if (normalizedResolution === 'client') {
    clientRefund = budget;
    newJobStatus = 'CANCELLED';
  } else {
    const pct = parseFloat(partial_percent) / 100;
    freelancerAmount = (budget - commission) * pct;
    clientRefund = budget * (1 - pct);
    newJobStatus = 'COMPLETED';
  }

  const txHash = generateDemoTxHash();
  db.disputes[dIdx].resolution = normalizedResolution;
  db.disputes[dIdx].partial_percent =
    normalizedResolution === 'partial' ? parseFloat(partial_percent) : undefined;
  db.disputes[dIdx].resolved_by = req.user!.id;
  db.disputes[dIdx].status = 'RESOLVED';
  db.disputes[dIdx].resolved_at = new Date().toISOString();

  const jIdx = db.jobs.findIndex(j => j.id === dispute.job_id);
  if (jIdx !== -1) db.jobs[jIdx].status = newJobStatus;

  if (freelancerAmount > 0 && job.freelancer_id) {
    const flIdx = db.users.findIndex(u => u.id === job.freelancer_id);
    if (flIdx !== -1) db.users[flIdx].total_earned += freelancerAmount;
  }

  db.transactions.push({
    id: uuidv4(), job_id: dispute.job_id,
    amount_xlm: normalizedResolution === 'client' ? clientRefund : freelancerAmount,
    type: normalizedResolution === 'client' ? 'refund' :
          normalizedResolution === 'partial' ? 'partial_payment' : 'release_payment',
    stellar_tx_hash: txHash, status: 'completed',
    created_at: new Date().toISOString(),
  });

  const resolvedMsg = normalizedResolution === 'freelancer'
    ? 'Freelancer lehine çözüldü.'
    : normalizedResolution === 'client'
    ? 'Müşteri lehine çözüldü.'
    : `Kısmi çözüm: %${partial_percent}`;

  if (job.freelancer_id) {
    pushNotification(db, job.freelancer_id, 'dispute_resolved',
      `"${job.title}" itirazı çözüldü: ${resolvedMsg}`, `/disputes/${dispute.id}`);
  }
  pushNotification(db, job.client_id, 'dispute_resolved',
    `"${job.title}" itirazı çözüldü: ${resolvedMsg}`, `/disputes/${dispute.id}`);

  writeDB(db);
  res.json({ success: true, resolution: normalizedResolution, freelancerAmount, clientRefund, tx_hash: txHash });
});

// GET /admin/transactions
router.get('/transactions', adminMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const enriched = db.transactions
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100)
    .map(tx => {
      const job = tx.job_id ? db.jobs.find(j => j.id === tx.job_id) : null;
      return { ...tx, job_title: job?.title };
    });
  res.json(enriched);
});

export default router;
