"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const escrow_1 = require("../stellar/escrow");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const { role } = req.user;
    const userId = req.user.id;
    let jobs = db.jobs;
    if (role === 'client') {
        jobs = jobs.filter(j => j.client_id === userId);
    }
    else if (role === 'freelancer') {
        const rf = req.query.role_filter;
        if (rf === 'available') {
            jobs = jobs.filter(j => j.status === 'open' && !j.freelancer_id);
        }
        else {
            jobs = jobs.filter(j => j.freelancer_id === userId || j.status === 'open');
        }
    }
    if (req.query.status)
        jobs = jobs.filter(j => j.status === req.query.status);
    const enriched = jobs.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(j => enrichJob(j, db));
    res.json(enriched);
});
router.get('/:id', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const job = db.jobs.find(j => j.id === req.params.id);
    if (!job)
        return res.status(404).json({ error: 'İş bulunamadı' });
    const dispute = db.disputes.find(d => d.job_id === job.id);
    const enriched = enrichJob(job, db);
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
router.post('/', auth_1.authMiddleware, async (req, res) => {
    if (req.user.role !== 'client')
        return res.status(403).json({ error: 'Sadece müşteriler iş oluşturabilir' });
    const { title, description, budget_xlm, category, deadline } = req.body;
    if (!title || !description || !budget_xlm || !category)
        return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
    const db = (0, schema_1.readDB)();
    const escrow = await (0, escrow_1.createEscrowAccount)();
    const job = {
        id: (0, uuid_1.v4)(), title, description, budget_xlm: parseFloat(budget_xlm),
        client_id: req.user.id, status: 'open', category,
        deadline: deadline || undefined, escrow_account: escrow.publicKey,
        escrow_secret: escrow.secretKey, escrow_funded: false,
        commission_xlm: parseFloat(budget_xlm) * 0.01,
        created_at: new Date().toISOString(),
    };
    db.jobs.push(job);
    (0, schema_1.writeDB)(db);
    const { escrow_secret: _, ...safe } = job;
    res.status(201).json(safe);
});
router.post('/:id/apply', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'freelancer')
        return res.status(403).json({ error: 'Sadece freelancer başvurabilir' });
    const db = (0, schema_1.readDB)();
    const idx = db.jobs.findIndex(j => j.id === req.params.id && j.status === 'open' && !j.freelancer_id);
    if (idx === -1)
        return res.status(404).json({ error: 'İş bulunamadı veya uygun değil' });
    db.jobs[idx].freelancer_id = req.user.id;
    db.jobs[idx].status = 'in_progress';
    (0, schema_1.writeDB)(db);
    res.json({ success: true });
});
router.post('/:id/fund', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'client')
        return res.status(403).json({ error: 'Yetkisiz' });
    const { tx_hash, from_address } = req.body;
    const db = (0, schema_1.readDB)();
    const idx = db.jobs.findIndex(j => j.id === req.params.id && j.client_id === req.user.id);
    if (idx === -1)
        return res.status(404).json({ error: 'İş bulunamadı' });
    db.jobs[idx].escrow_funded = true;
    db.transactions.push({
        id: (0, uuid_1.v4)(), job_id: req.params.id,
        from_address: from_address || 'wallet', to_address: db.jobs[idx].escrow_account,
        amount_xlm: db.jobs[idx].budget_xlm, type: 'escrow_fund',
        stellar_tx_hash: tx_hash || (0, escrow_1.generateDemoTxHash)(), status: 'completed',
        created_at: new Date().toISOString(),
    });
    (0, schema_1.writeDB)(db);
    res.json({ success: true });
});
router.post('/:id/deliver', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'freelancer')
        return res.status(403).json({ error: 'Yetkisiz' });
    const { delivery_note } = req.body;
    const db = (0, schema_1.readDB)();
    const idx = db.jobs.findIndex(j => j.id === req.params.id && j.freelancer_id === req.user.id && j.status === 'in_progress');
    if (idx === -1)
        return res.status(404).json({ error: 'İş bulunamadı' });
    db.jobs[idx].status = 'delivered';
    db.jobs[idx].delivery_note = delivery_note || '';
    db.jobs[idx].delivered_at = new Date().toISOString();
    (0, schema_1.writeDB)(db);
    res.json({ success: true });
});
router.post('/:id/approve', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'client')
        return res.status(403).json({ error: 'Yetkisiz' });
    const db = (0, schema_1.readDB)();
    const idx = db.jobs.findIndex(j => j.id === req.params.id && j.client_id === req.user.id && j.status === 'delivered');
    if (idx === -1)
        return res.status(404).json({ error: 'İş bulunamadı' });
    const job = db.jobs[idx];
    if (!job.freelancer_id)
        return res.status(400).json({ error: 'Freelancer atanmamış' });
    const commission = job.budget_xlm * 0.01;
    const payment = job.budget_xlm - commission;
    const txHash = (0, escrow_1.generateDemoTxHash)();
    db.jobs[idx].status = 'completed';
    db.jobs[idx].completed_at = new Date().toISOString();
    const flIdx = db.users.findIndex(u => u.id === job.freelancer_id);
    if (flIdx !== -1) {
        db.users[flIdx].total_earned += payment;
        db.users[flIdx].completed_jobs += 1;
    }
    const clIdx = db.users.findIndex(u => u.id === req.user.id);
    if (clIdx !== -1)
        db.users[clIdx].total_spent += job.budget_xlm;
    db.transactions.push({
        id: (0, uuid_1.v4)(), job_id: req.params.id, from_address: job.escrow_account,
        to_address: db.users.find(u => u.id === job.freelancer_id)?.wallet_address,
        amount_xlm: payment, type: 'release_payment', stellar_tx_hash: txHash,
        status: 'completed', created_at: new Date().toISOString(),
    });
    (0, schema_1.writeDB)(db);
    res.json({ success: true, tx_hash: txHash, payment_amount: payment, commission });
});
router.get('/:id/transactions', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    res.json(db.transactions.filter(t => t.job_id === req.params.id).sort((a, b) => b.created_at.localeCompare(a.created_at)));
});
function enrichJob(job, db) {
    const client = db.users.find(u => u.id === job.client_id);
    const freelancer = job.freelancer_id ? db.users.find(u => u.id === job.freelancer_id) : null;
    const { escrow_secret: _, ...safe } = job;
    return {
        ...safe,
        client_name: client?.name,
        client_wallet: client?.wallet_address,
        freelancer_name: freelancer?.name,
        freelancer_wallet: freelancer?.wallet_address,
        freelancer_reputation: freelancer?.reputation,
    };
}
exports.default = router;
