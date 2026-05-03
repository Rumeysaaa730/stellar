import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/schema';
import authRoutes from './routes/auth';
import jobsRoutes from './routes/jobs';
import disputesRoutes from './routes/disputes';
import adminRoutes from './routes/admin';
import notificationsRoutes from './routes/notifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', network: 'Stellar Testnet', time: new Date().toISOString() })
);

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 FreelanceChain API — http://localhost:${PORT}`);
    console.log(`🌐 Stellar Testnet aktif\n`);
  });
}

start();
