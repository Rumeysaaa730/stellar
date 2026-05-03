import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'db.json');

export interface User {
  id: string; name: string;
  role: 'client' | 'freelancer' | 'admin'; wallet_address: string;
  balance_xlm: number; total_earned: number; total_spent: number;
  reputation: number; completed_jobs: number; created_at: string;
}

export interface Job {
  id: string; title: string; description: string; budget_xlm: number;
  client_id: string; freelancer_id?: string; status: string; category: string;
  deadline?: string; escrow_account?: string; escrow_secret?: string;
  escrow_funded: boolean; commission_xlm?: number;
  applicants?: string[];
  intended_freelancer_wallet?: string;
  attachment?: { name: string; size: number; type: string };
  delivery_note?: string; delivered_at?: string; completed_at?: string; created_at: string;
}

export interface Dispute {
  id: string; job_id: string; opened_by: string; reason: string; description: string;
  freelancer_response?: string; resolution?: string; partial_percent?: number;
  resolved_by?: string; status: string; opened_at: string; resolved_at?: string;
  evidence?: { name: string; size: number; type: string };
}

export interface Transaction {
  id: string; job_id?: string; from_address?: string; to_address?: string;
  amount_xlm: number; type: string; stellar_tx_hash?: string; status: string; created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface DB {
  users: User[];
  jobs: Job[];
  disputes: Dispute[];
  transactions: Transaction[];
  notifications: Notification[];
}

function ensureDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

export function readDB(): DB {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    const empty: DB = { users: [], jobs: [], disputes: [], transactions: [], notifications: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  // Migrate existing DB to include notifications array
  if (!raw.notifications) raw.notifications = [];
  return raw as DB;
}

export function writeDB(db: DB): void {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function pushNotification(
  db: DB,
  user_id: string,
  type: string,
  message: string,
  link?: string
): void {
  db.notifications.push({
    id: uuidv4(),
    user_id,
    type,
    message,
    read: false,
    created_at: new Date().toISOString(),
    link,
  });
}

export function initDB() {
  const db = readDB();

  if (!db.users.find(u => u.id === 'admin-001')) {
    db.users.push({
      id: 'admin-001', name: 'Platform Admin', role: 'admin',
      wallet_address: 'GADMIN123DEMOSTELLAR', balance_xlm: 0,
      total_earned: 0, total_spent: 0, reputation: 5.0,
      completed_jobs: 0, created_at: new Date().toISOString(),
    });
  }

  if (!db.users.find(u => u.id === 'client-demo')) {
    db.users.push({
      id: 'client-demo', name: 'Ahmet Yılmaz', role: 'client',
      wallet_address: 'GCLIENT123DEMOSTELLAR',
      balance_xlm: 5000, total_earned: 0, total_spent: 2850,
      reputation: 4.8, completed_jobs: 12,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    });
  }

  if (!db.users.find(u => u.id === 'freelancer-demo')) {
    db.users.push({
      id: 'freelancer-demo', name: 'Zeynep Kaya', role: 'freelancer',
      wallet_address: 'GFREELANCER123DEMOSTELLAR',
      balance_xlm: 1200, total_earned: 15420, total_spent: 0,
      reputation: 4.9, completed_jobs: 28,
      created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    });
  }

  writeDB(db);
}
