"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    const { name, wallet_address, role } = req.body;
    if (!name || !wallet_address || !role)
        return res.status(400).json({ error: 'Ad soyad, cüzdan adresi ve rol zorunlu' });
    if (!['client', 'freelancer'].includes(role))
        return res.status(400).json({ error: 'Geçersiz rol' });
    const db = (0, schema_1.readDB)();
    if (db.users.find(u => u.wallet_address === wallet_address))
        return res.status(409).json({ error: 'Bu cüzdan adresi zaten kayıtlı' });
    const user = {
        id: (0, uuid_1.v4)(), name: name.trim(), wallet_address, role, balance_xlm: 0,
        total_earned: 0, total_spent: 0, reputation: 5.0, completed_jobs: 0,
        created_at: new Date().toISOString(),
    };
    db.users.push(user);
    (0, schema_1.writeDB)(db);
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user });
});
router.post('/login', async (req, res) => {
    const { wallet_address, name } = req.body;
    if (!wallet_address)
        return res.status(400).json({ error: 'Cüzdan adresi zorunlu' });
    const db = (0, schema_1.readDB)();
    const idx = db.users.findIndex(u => u.wallet_address === wallet_address);
    if (idx === -1)
        return res.status(404).json({ error: 'Kayıtlı hesap bulunamadı' });
    if (name && name.trim()) {
        db.users[idx].name = name.trim();
        (0, schema_1.writeDB)(db);
    }
    const user = db.users[idx];
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
});
router.get('/me', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const { password: _, ...safe } = user;
    res.json(safe);
});
router.get('/transactions', auth_1.authMiddleware, (req, res) => {
    const db = (0, schema_1.readDB)();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const userJobs = db.jobs.filter(j => j.client_id === user.id || j.freelancer_id === user.id).map(j => j.id);
    const txs = db.transactions
        .filter(t => t.job_id && userJobs.includes(t.job_id) || t.from_address === user.wallet_address || t.to_address === user.wallet_address)
        .map(t => {
        const job = t.job_id ? db.jobs.find(j => j.id === t.job_id) : null;
        return { ...t, job_title: job?.title };
    })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(txs);
});
router.put('/wallet', auth_1.authMiddleware, (req, res) => {
    const { wallet_address } = req.body;
    const db = (0, schema_1.readDB)();
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx !== -1)
        db.users[idx].wallet_address = wallet_address;
    (0, schema_1.writeDB)(db);
    res.json({ success: true });
});
exports.default = router;
