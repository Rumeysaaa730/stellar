"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readDB = readDB;
exports.writeDB = writeDB;
exports.initDB = initDB;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_DIR = path_1.default.join(__dirname, '../../data');
const DB_PATH = path_1.default.join(DB_DIR, 'db.json');
function ensureDir() {
    if (!fs_1.default.existsSync(DB_DIR))
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
function readDB() {
    ensureDir();
    if (!fs_1.default.existsSync(DB_PATH)) {
        const empty = { users: [], jobs: [], disputes: [], transactions: [] };
        fs_1.default.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
        return empty;
    }
    return JSON.parse(fs_1.default.readFileSync(DB_PATH, 'utf-8'));
}
function writeDB(db) {
    ensureDir();
    fs_1.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function initDB() {
    const db = readDB();
    // Mock/demo veriler temizleniyor — gerçek kullanıcılar Freighter ile kaydolur
    const cleaned = {
        ...db,
        users: db.users.filter(u => !['admin-001', 'client-demo', 'freelancer-demo'].includes(u.id)),
        jobs: db.jobs.filter(j => !['job-001', 'job-002', 'job-003', 'job-004'].includes(j.id)),
        transactions: db.transactions.filter(t => !['GCLIENT123DEMOSTELLAR', 'GFREELANCER123DEMOSTELLAR', 'GADMIN123DEMOSTELLAR',
            'GESCROW001DEMOSTELLAR', 'GESCROW003DEMOSTELLAR', 'GESCROW004DEMOSTELLAR']
            .includes(t.from_address || '') &&
            !['GCLIENT123DEMOSTELLAR', 'GFREELANCER123DEMOSTELLAR', 'GADMIN123DEMOSTELLAR',
                'GESCROW001DEMOSTELLAR', 'GESCROW003DEMOSTELLAR', 'GESCROW004DEMOSTELLAR']
                .includes(t.to_address || '')),
    };
    writeDB(cleaned);
}
