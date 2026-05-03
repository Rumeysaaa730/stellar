import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readDB, writeDB, pushNotification } from '../db/schema';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateDemoTxHash } from '../stellar/escrow';

const router = Router();

// GET /disputes
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  let disputes = db.disputes;
  if (req.user!.role === 'client') {
    const myJobIds = db.jobs.filter(j => j.client_id === req.user!.id).map(j => j.id);
    disputes = disputes.filter(d => myJobIds.includes(d.job_id));
  } else if (req.user!.role === 'freelancer') {
    const myJobIds = db.jobs.filter(j => j.freelancer_id === req.user!.id).map(j => j.id);
    disputes = disputes.filter(d => myJobIds.includes(d.job_id));
  }
  const enriched = disputes
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at))
    .map(d => enrichDispute(d, db));
  res.json(enriched);
});

// GET /disputes/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const d = db.disputes.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'İtiraz bulunamadı' });
  res.json(enrichDispute(d, db, true));
});

// POST /disputes — open dispute (client or assigned freelancer)
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  if (!['client', 'freelancer'].includes(role))
    return res.status(403).json({ error: 'Yetkisiz' });

  const { job_id, reason, description } = req.body;
  if (!job_id || !reason || !description) return res.status(400).json({ error: 'Eksik bilgi' });
  if (!['not_delivered', 'poor_quality', 'incomplete', 'bad_quality', 'communication'].includes(reason))
    return res.status(400).json({ error: 'Geçersiz sebep' });

  if (description.trim().length < 20)
    return res.status(400).json({ error: 'Açıklama en az 20 karakter olmalı' });

  const { evidence } = req.body;

  const db = readDB();
  const job = role === 'client'
    ? db.jobs.find(j => j.id === job_id && j.client_id === req.user!.id)
    : db.jobs.find(j => j.id === job_id && j.freelancer_id === req.user!.id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });
  if (!['delivered', 'in_progress', 'SUBMITTED', 'IN_PROGRESS', 'FUNDED'].includes(job.status))
    return res.status(400).json({ error: 'Bu iş için itiraz açılamaz' });
  if (db.disputes.find(d => d.job_id === job_id))
    return res.status(409).json({ error: 'Bu iş için zaten bir itiraz mevcut' });

  const dispute = {
    id: uuidv4(), job_id, opened_by: req.user!.id, reason, description,
    status: 'OPEN', opened_at: new Date().toISOString(),
    ...(evidence ? { evidence } : {}),
  };
  db.disputes.push(dispute);

  const jIdx = db.jobs.findIndex(j => j.id === job_id);
  if (jIdx !== -1) db.jobs[jIdx].status = 'DISPUTED';

  // Notify the other party
  if (role === 'client' && job.freelancer_id) {
    pushNotification(
      db, job.freelancer_id, 'dispute_opened',
      `"${job.title}" işi için müşteri itiraz açtı. Yanıtlayabilirsiniz.`,
      `/disputes/${dispute.id}`
    );
  } else if (role === 'freelancer') {
    pushNotification(
      db, job.client_id, 'dispute_opened',
      `"${job.title}" işi için freelancer itiraz açtı.`,
      `/disputes/${dispute.id}`
    );
  }

  writeDB(db);
  res.status(201).json({ id: dispute.id, success: true });
});

// POST /disputes/:id/respond — freelancer responds
router.post('/:id/respond', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'freelancer') return res.status(403).json({ error: 'Yetkisiz' });
  const { response } = req.body;
  if (!response) return res.status(400).json({ error: 'Yanıt gerekli' });
  const db = readDB();
  const dIdx = db.disputes.findIndex(d => {
    if (d.id !== req.params.id || !['OPEN', 'open', 'REVIEWING'].includes(d.status)) return false;
    const job = db.jobs.find(j => j.id === d.job_id);
    return job?.freelancer_id === req.user!.id;
  });
  if (dIdx === -1) return res.status(404).json({ error: 'İtiraz bulunamadı' });
  db.disputes[dIdx].freelancer_response = response;
  db.disputes[dIdx].status = 'REVIEWING';

  // Notify client
  const job = db.jobs.find(j => j.id === db.disputes[dIdx].job_id);
  if (job) {
    pushNotification(
      db, job.client_id, 'dispute_opened',
      `"${job.title}" itirazına freelancer yanıt verdi.`,
      `/disputes/${req.params.id}`
    );
  }

  writeDB(db);
  res.json({ success: true });
});

// POST /disputes/:id/resolve — admin resolves
router.post('/:id/resolve', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  const { resolution, partial_percent } = req.body;
  if (!['freelancer', 'client', 'partial', 'pay_freelancer', 'refund_client', 'split'].includes(resolution))
    return res.status(400).json({ error: 'Geçersiz karar' });

  const db = readDB();
  const dIdx = db.disputes.findIndex(d => d.id === req.params.id);
  if (dIdx === -1) return res.status(404).json({ error: 'İtiraz bulunamadı' });
  if (db.disputes[dIdx].status === 'RESOLVED' || db.disputes[dIdx].status === 'resolved')
    return res.status(400).json({ error: 'Zaten çözüldü' });

  const dispute = db.disputes[dIdx];
  const job = db.jobs.find(j => j.id === dispute.job_id);
  if (!job) return res.status(404).json({ error: 'İş bulunamadı' });

  // Normalize resolution action
  const normalizedResolution =
    resolution === 'pay_freelancer' ? 'freelancer' :
    resolution === 'refund_client' ? 'client' :
    resolution === 'split' ? 'partial' : resolution;

  const budget = job.budget_xlm;
  const commission = budget * 0.01;
  let freelancerAmount = 0;
  let clientRefund = 0;
  let newJobStatus = 'REFUNDED';

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

  // Notify both parties
  const resolvedMsg = normalizedResolution === 'freelancer'
    ? `Freelancer lehine çözüldü. ${freelancerAmount.toFixed(2)} XLM serbest bırakıldı.`
    : normalizedResolution === 'client'
    ? `Müşteri lehine çözüldü. ${clientRefund.toFixed(2)} XLM iade edildi.`
    : `Kısmi çözüm: Freelancer %${partial_percent} aldı.`;

  if (job.freelancer_id) {
    pushNotification(db, job.freelancer_id, 'dispute_resolved',
      `"${job.title}" itirazı çözüldü: ${resolvedMsg}`, `/disputes/${dispute.id}`);
  }
  pushNotification(db, job.client_id, 'dispute_resolved',
    `"${job.title}" itirazı çözüldü: ${resolvedMsg}`, `/disputes/${dispute.id}`);

  writeDB(db);
  res.json({ success: true, resolution: normalizedResolution, freelancerAmount, clientRefund, tx_hash: txHash });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichDispute(d: any, db: ReturnType<typeof readDB>, full = false) {
  const job = db.jobs.find(j => j.id === d.job_id);
  const client = job ? db.users.find(u => u.id === job.client_id) : null;
  const freelancer = (job && job.freelancer_id) ? db.users.find(u => u.id === job.freelancer_id) : null;
  const opener = db.users.find(u => u.id === d.opened_by);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any = {
    ...d, job_title: job?.title, budget_xlm: job?.budget_xlm,
    client_id: job?.client_id, freelancer_id: job?.freelancer_id,
    client_name: client?.name, freelancer_name: freelancer?.name,
    opened_by_name: opener?.name,
  };
  if (full) {
    base.job_description = job?.description;
    base.delivery_note = job?.delivery_note;
    base.client_email = client?.wallet_address;
    base.freelancer_email = freelancer?.wallet_address;
    base.opened_by_role = opener?.role;
  }
  return base;
}

export default router;
