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
    let disputes = db.disputes;
    if (req.user.role === 'client') {
        const myJobIds = db.jobs.filter(j => j.client_id === req.user.id).map(j => j.id);
        disputes = disputes.filter(d => myJobIds.includes(d.job_id));
    }
    else if (req.user.role === 'freelancer') {
        const myJobIds = db.jobs.filter(j => j.freelancer_id === req.user.id).map(j => j.id);
        disputes = disputes.filter(d => myJobIds.includes(d.job_id));
    }
    const enriched = disputes.sort((a, b) => b.opened_at.localeCompare(a.opened_at)).map(d => enrichDispute(d, db));
    res.json(enriched);
});
router.get('/:id', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const d = db.disputes.find(x => x.id === req.params.id);
    if (!d)
        return res.status(404).json({ error: 'İtiraz bulunamadı' });
    res.json(enrichDispute(d, db, true));
});
router.post('/', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'client')
        return res.status(403).json({ error: 'Sadece müşteriler itiraz açabilir' });
    const { job_id, reason, description } = req.body;
    if (!job_id || !reason || !description)
        return res.status(400).json({ error: 'Eksik bilgi' });
    if (!['not_delivered', 'poor_quality', 'incomplete'].includes(reason))
        return res.status(400).json({ error: 'Geçersiz sebep' });
    const db = (0, schema_1.readDB)();
    const job = db.jobs.find(j => j.id === job_id && j.client_id === req.user.id);
    if (!job)
        return res.status(404).json({ error: 'İş bulunamadı' });
    if (!['delivered', 'in_progress'].includes(job.status))
        return res.status(400).json({ error: 'Bu iş için itiraz açılamaz' });
    if (db.disputes.find(d => d.job_id === job_id))
        return res.status(409).json({ error: 'Bu iş için zaten bir itiraz mevcut' });
    const dispute = {
        id: (0, uuid_1.v4)(), job_id, opened_by: req.user.id, reason, description,
        status: 'open', opened_at: new Date().toISOString(),
    };
    db.disputes.push(dispute);
    const jIdx = db.jobs.findIndex(j => j.id === job_id);
    if (jIdx !== -1)
        db.jobs[jIdx].status = 'disputed';
    (0, schema_1.writeDB)(db);
    res.status(201).json({ id: dispute.id, success: true });
});
router.post('/:id/respond', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'freelancer')
        return res.status(403).json({ error: 'Yetkisiz' });
    const { response } = req.body;
    const db = (0, schema_1.readDB)();
    const dIdx = db.disputes.findIndex(d => {
        if (d.id !== req.params.id || d.status !== 'open')
            return false;
        const job = db.jobs.find(j => j.id === d.job_id);
        return job?.freelancer_id === req.user.id;
    });
    if (dIdx === -1)
        return res.status(404).json({ error: 'İtiraz bulunamadı' });
    db.disputes[dIdx].freelancer_response = response;
    (0, schema_1.writeDB)(db);
    res.json({ success: true });
});
router.post('/:id/resolve', auth_1.authMiddleware, (req, res) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    const { resolution, partial_percent } = req.body;
    if (!['freelancer', 'client', 'partial'].includes(resolution))
        return res.status(400).json({ error: 'Geçersiz karar' });
    const db = (0, schema_1.readDB)();
    const dIdx = db.disputes.findIndex(d => d.id === req.params.id);
    if (dIdx === -1)
        return res.status(404).json({ error: 'İtiraz bulunamadı' });
    if (db.disputes[dIdx].status === 'resolved')
        return res.status(400).json({ error: 'Zaten çözüldü' });
    const dispute = db.disputes[dIdx];
    const job = db.jobs.find(j => j.id === dispute.job_id);
    if (!job)
        return res.status(404).json({ error: 'İş bulunamadı' });
    const budget = job.budget_xlm;
    const commission = budget * 0.01;
    let freelancerAmount = 0;
    let clientRefund = 0;
    let newJobStatus = 'refunded';
    if (resolution === 'freelancer') {
        freelancerAmount = budget - commission;
        newJobStatus = 'completed';
    }
    else if (resolution === 'client') {
        clientRefund = budget;
    }
    else {
        const pct = parseFloat(partial_percent) / 100;
        freelancerAmount = (budget - commission) * pct;
        clientRefund = budget * (1 - pct);
        newJobStatus = 'completed';
    }
    const txHash = (0, escrow_1.generateDemoTxHash)();
    db.disputes[dIdx].resolution = resolution;
    db.disputes[dIdx].partial_percent = resolution === 'partial' ? parseFloat(partial_percent) : undefined;
    db.disputes[dIdx].resolved_by = req.user.id;
    db.disputes[dIdx].status = 'resolved';
    db.disputes[dIdx].resolved_at = new Date().toISOString();
    const jIdx = db.jobs.findIndex(j => j.id === dispute.job_id);
    if (jIdx !== -1)
        db.jobs[jIdx].status = newJobStatus;
    if (freelancerAmount > 0 && job.freelancer_id) {
        const flIdx = db.users.findIndex(u => u.id === job.freelancer_id);
        if (flIdx !== -1)
            db.users[flIdx].total_earned += freelancerAmount;
    }
    db.transactions.push({
        id: (0, uuid_1.v4)(), job_id: dispute.job_id,
        amount_xlm: resolution === 'client' ? clientRefund : freelancerAmount,
        type: resolution === 'client' ? 'refund' : resolution === 'partial' ? 'partial_payment' : 'release_payment',
        stellar_tx_hash: txHash, status: 'completed', created_at: new Date().toISOString(),
    });
    (0, schema_1.writeDB)(db);
    res.json({ success: true, resolution, freelancerAmount, clientRefund, tx_hash: txHash });
});
function enrichDispute(d, db, full = false) {
    const job = db.jobs.find(j => j.id === d.job_id);
    const client = job ? db.users.find(u => u.id === job.client_id) : null;
    const freelancer = (job && job.freelancer_id) ? db.users.find(u => u.id === job.freelancer_id) : null;
    const opener = db.users.find(u => u.id === d.opened_by);
    const base = {
        ...d, job_title: job?.title, budget_xlm: job?.budget_xlm,
        client_id: job?.client_id, freelancer_id: job?.freelancer_id,
        client_name: client?.name, freelancer_name: freelancer?.name, opened_by_name: opener?.name,
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
exports.default = router;
