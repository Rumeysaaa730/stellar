"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/stats', auth_1.adminMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const jobs = db.jobs;
    const txs = db.transactions;
    const stats = {
        total_users: db.users.filter(u => u.role !== 'admin').length,
        total_clients: db.users.filter(u => u.role === 'client').length,
        total_freelancers: db.users.filter(u => u.role === 'freelancer').length,
        total_jobs: jobs.length,
        open_jobs: jobs.filter(j => j.status === 'open').length,
        in_progress_jobs: jobs.filter(j => j.status === 'in_progress').length,
        completed_jobs: jobs.filter(j => j.status === 'completed').length,
        disputed_jobs: jobs.filter(j => j.status === 'disputed').length,
        open_disputes: db.disputes.filter(d => d.status === 'open').length,
        total_volume_xlm: jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.budget_xlm, 0),
        commission_earned: jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.commission_xlm || 0), 0),
        recent_transactions: txs.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
    };
    res.json(stats);
});
router.get('/users', auth_1.adminMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    res.json(db.users.map(u => { const { ...safe } = u; delete safe.password; return safe; }).sort((a, b) => b.created_at.localeCompare(a.created_at)));
});
router.get('/jobs', auth_1.adminMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const enriched = db.jobs.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(j => {
        const client = db.users.find(u => u.id === j.client_id);
        const freelancer = j.freelancer_id ? db.users.find(u => u.id === j.freelancer_id) : null;
        const { escrow_secret: _, ...safe } = j;
        return { ...safe, client_name: client?.name, freelancer_name: freelancer?.name };
    });
    res.json(enriched);
});
router.get('/disputes', auth_1.adminMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const enriched = db.disputes.sort((a, b) => b.opened_at.localeCompare(a.opened_at)).map(d => {
        const job = db.jobs.find(j => j.id === d.job_id);
        const client = job ? db.users.find(u => u.id === job.client_id) : null;
        const freelancer = (job?.freelancer_id) ? db.users.find(u => u.id === job.freelancer_id) : null;
        const opener = db.users.find(u => u.id === d.opened_by);
        return { ...d, job_title: job?.title, budget_xlm: job?.budget_xlm, client_name: client?.name, freelancer_name: freelancer?.name, opened_by_name: opener?.name };
    });
    res.json(enriched);
});
router.get('/transactions', auth_1.adminMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const enriched = db.transactions.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100).map(tx => {
        const job = tx.job_id ? db.jobs.find(j => j.id === tx.job_id) : null;
        return { ...tx, job_title: job?.title };
    });
    res.json(enriched);
});
exports.default = router;
