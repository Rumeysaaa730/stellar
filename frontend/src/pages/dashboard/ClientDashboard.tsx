import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { Job, Transaction } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { truncateAddress } from '../../stellar/freighter';
import JobCard from '../../components/JobCard';
import EscrowCard from '../../components/EscrowCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const CATEGORIES = [
  'Yazılım Geliştirme', 'Tasarım', 'İçerik & Metin',
  'Pazarlama', 'Veri & Analitik', 'Diğer',
];

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Oluşturuldu', FUNDED: 'Finanslandı', IN_PROGRESS: 'Devam Ediyor',
  in_progress: 'Devam Ediyor', SUBMITTED: 'Teslim Edildi', delivered: 'Teslim Edildi',
  APPROVED: 'Onaylandı', COMPLETED: 'Tamamlandı', completed: 'Tamamlandı',
  DISPUTED: 'İtirazda', disputed: 'İtirazda', CANCELLED: 'İptal', open: 'Açık',
};

const TX_LABELS: Record<string, string> = {
  escrow_fund: 'Escrow Yatırma',
  release_payment: 'Ödeme Serbest Bırakma',
  refund: 'İade',
  partial_payment: 'Kısmi Ödeme',
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { address, isConnected, xlmBalance, connect, disconnect, fundFriendbot, refreshBalance, sessionExpired, minutesLeft } = useWallet();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', budget_xlm: '', category: '',
    freelancer_address: '', delivery_days: '' as '' | '3' | '7' | '14' | '30',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [escrowFilter, setEscrowFilter] = useState<'tümü' | 'aktif' | 'bekleyen' | 'tamamlanan' | 'ihtilaflı'>('tümü');

  useEffect(() => {
    loadData();
    if (address) refreshBalance();
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowCreateJob(true);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, txsRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/auth/transactions'),
      ]);
      setJobs(jobsRes.data);
      setTransactions(txsRes.data);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.freelancer_address) {
      e.freelancer_address = 'Freelancer Stellar adresi zorunlu';
    } else if (!form.freelancer_address.startsWith('G') || form.freelancer_address.length !== 56) {
      e.freelancer_address = '⚠️ Geçerli bir Stellar adresi girin (G ile başlar)';
    }
    if (!form.title) {
      e.title = 'Başlık zorunlu';
    } else if (form.title.length < 5 || form.title.length > 100) {
      e.title = `5-100 karakter olmalı (şu an: ${form.title.length})`;
    }
    if (!form.description) {
      e.description = 'Açıklama zorunlu';
    } else if (form.description.length < 20 || form.description.length > 1000) {
      e.description = `20-1000 karakter olmalı (şu an: ${form.description.length})`;
    }
    if (!form.category) e.category = 'Kategori seçin';
    if (!form.budget_xlm) {
      e.budget_xlm = 'Miktar zorunlu';
    } else {
      const b = parseFloat(form.budget_xlm);
      if (isNaN(b) || b < 1) {
        e.budget_xlm = '⚠️ Minimum 1 XLM yatırabilirsiniz';
      } else if (b > 1_000_000) {
        e.budget_xlm = '⚠️ Maksimum 1.000.000 XLM yatırabilirsiniz';
      } else if (isConnected && xlmBalance > 0 && b > xlmBalance) {
        e.budget_xlm = 'balance_insufficient';
      }
    }
    if (!form.delivery_days) e.delivery_days = 'Teslim süresi seçin';
    return e;
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const MAX = 5 * 1024 * 1024;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (file.size > MAX) { toast.error('Dosya 5MB\'dan büyük olamaz'); return; }
    if (!ALLOWED.includes(file.type)) { toast.error('Sadece resim (JPG, PNG, GIF, WebP) veya PDF yüklenebilir'); return; }
    setAttachment(file);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        budget_xlm: parseFloat(form.budget_xlm),
        category: form.category,
        freelancer_address: form.freelancer_address.trim(),
        delivery_days: parseInt(form.delivery_days),
      };
      if (attachment) {
        payload.attachment = { name: attachment.name, size: attachment.size, type: attachment.type };
      }
      await api.post('/jobs', payload);
      toast.success('Escrow oluşturuldu! Freelancer bildirim aldı.');
      setShowCreateJob(false);
      setForm({ title: '', description: '', budget_xlm: '', category: '', freelancer_address: '', delivery_days: '' });
      setAttachment(null);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; code?: string };
      if (!axiosErr.response) {
        toast.error('❌ Bağlantı hatası, lütfen tekrar deneyin');
      } else {
        toast.error(axiosErr.response.data?.error || 'Hata oluştu');
      }
    } finally {
      setCreating(false);
    }
  };

  const _budgetNum = parseFloat(form.budget_xlm);
  const isFormValid =
    form.freelancer_address.startsWith('G') && form.freelancer_address.length === 56 &&
    form.title.length >= 5 && form.title.length <= 100 &&
    form.description.length >= 20 && form.description.length <= 1000 &&
    form.category !== '' &&
    form.budget_xlm !== '' && !isNaN(_budgetNum) && _budgetNum >= 1 && _budgetNum <= 1_000_000 &&
    !(isConnected && xlmBalance > 0 && _budgetNum > xlmBalance) &&
    form.delivery_days !== '';

  const myJobs = jobs.filter(j => j.client_id === user?.id);
  const pendingJobs  = myJobs.filter(j => ['CREATED', 'FUNDED', 'open'].includes(j.status));
  const activeJobs   = myJobs.filter(j => ['IN_PROGRESS', 'in_progress', 'SUBMITTED', 'delivered'].includes(j.status));
  const completedJobs = myJobs.filter(j => ['COMPLETED', 'completed'].includes(j.status));
  const disputedJobs  = myJobs.filter(j => ['DISPUTED', 'disputed'].includes(j.status));
  const jobsWithApplicants = myJobs.filter(j => (j.applicant_count ?? 0) > 0 && !j.freelancer_id);
  const totalSpent = user?.total_spent ?? 0;

  const filteredEscrows = myJobs.filter(j => {
    switch (escrowFilter) {
      case 'aktif':      return activeJobs.includes(j);
      case 'bekleyen':   return pendingJobs.includes(j);
      case 'tamamlanan': return completedJobs.includes(j);
      case 'ihtilaflı':  return disputedJobs.includes(j);
      default:           return true;
    }
  });

  const filterCounts = {
    tümü: myJobs.length,
    aktif: activeJobs.length,
    bekleyen: pendingJobs.length,
    tamamlanan: completedJobs.length,
    ihtilaflı: disputedJobs.length,
  };

  const FILTER_LABELS = {
    tümü: 'Tümü', aktif: 'Aktif', bekleyen: 'Bekleyen',
    tamamlanan: 'Tamamlanan', ihtilaflı: 'İhtilaflı',
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Hoş geldiniz, {user?.name}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              🧑‍💼 Müşteri Paneli · Stellar Testnet
            </p>
          </div>
          <Button
            onClick={() => setShowCreateJob(true)}
            disabled={!isConnected || sessionExpired}
            title={!isConnected || sessionExpired ? 'Escrow oluşturmak için cüzdanınızı bağlayın' : undefined}
            leftIcon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            }
          >
            Yeni İş Oluştur
          </Button>
        </div>

        {/* Wallet Card */}
        <Card className={`mb-6 ${sessionExpired ? 'border-status-warning/50' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-text-muted font-medium">Freighter Cüzdanı</div>
            <div className="flex items-center gap-2">
              {minutesLeft !== null && minutesLeft <= 10 && !sessionExpired && (
                <span className="text-xs text-status-warning font-mono bg-status-warning/10 px-2 py-0.5 rounded-full">
                  ⏰ {minutesLeft}dk kaldı
                </span>
              )}
              <div className={`w-2 h-2 rounded-full ${sessionExpired ? 'bg-status-warning animate-pulse' : isConnected ? 'bg-status-success animate-pulse' : 'bg-text-muted'}`} />
            </div>
          </div>
          {sessionExpired ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-status-warning text-sm font-medium">⏰ Oturum süresi doldu</div>
              <button onClick={connect}
                className="flex items-center gap-2 bg-status-warning/20 border border-status-warning/40 hover:bg-status-warning/30 text-status-warning rounded-xl px-4 py-2 text-sm font-medium transition-all">
                Tekrar Bağlan
              </button>
            </div>
          ) : isConnected && address ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-mono text-xs text-text-muted mb-1">{truncateAddress(address, 8)}</div>
                <div className="text-2xl font-black text-text-primary">
                  {xlmBalance.toFixed(2)} <span className="text-brand-secondary text-base">XLM</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fundFriendbot}
                  className="text-xs bg-brand-accent/20 text-brand-accent border border-brand-accent/30 px-3 py-1.5 rounded-lg hover:bg-brand-accent/30 transition-all">
                  🤖 Friendbot
                </button>
                <button onClick={refreshBalance}
                  className="text-xs bg-bg-elevated text-text-muted border border-bg-border px-3 py-1.5 rounded-lg hover:text-text-primary transition-all">
                  ↻ Yenile
                </button>
                <button onClick={disconnect}
                  className="text-xs text-text-muted hover:text-status-error transition-colors px-2 py-1.5">
                  Bağlantıyı Kes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-text-secondary text-sm">Cüzdan bağlı değil</div>
              <button onClick={connect}
                className="flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/50 hover:bg-brand-primary/30 text-brand-secondary rounded-xl px-4 py-2 text-sm font-medium transition-all">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                </svg>
                Freighter Bağla
              </button>
            </div>
          )}
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: '💰', color: 'bg-brand-primary/20',
              label: 'Bakiye',
              value: `${isConnected ? xlmBalance.toFixed(2) : (user?.balance_xlm ?? 0).toLocaleString()} XLM`,
              sub: 'cüzdanda', textColor: 'text-brand-secondary',
            },
            {
              icon: '⚡', color: 'bg-status-warning/20',
              label: 'Aktif Escrow\'lar',
              value: activeJobs.length, sub: 'devam ediyor', textColor: 'text-status-warning',
            },
            {
              icon: '✅', color: 'bg-status-success/20',
              label: 'Tamamlanan',
              value: user?.completed_jobs ?? completedJobs.length, sub: 'proje', textColor: 'text-status-success',
            },
            {
              icon: '💸', color: 'bg-status-error/20',
              label: 'Toplam Harcama',
              value: `${totalSpent.toLocaleString()} XLM`, sub: 'ödendi', textColor: 'text-text-primary',
            },
          ].map((stat, i) => (
            <Card key={i}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center text-base`}>
                  {stat.icon}
                </div>
                <span className="text-xs text-text-muted font-medium">{stat.label}</span>
              </div>
              <div className={`text-2xl font-black ${stat.textColor}`}>{stat.value}</div>
              <div className="text-xs text-text-muted mt-1">{stat.sub}</div>
            </Card>
          ))}
        </div>

        {/* Jobs awaiting applicant review */}
        {jobsWithApplicants.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-heading text-lg font-semibold text-text-primary">Başvuru Bekleyen İşler</h2>
              <span className="bg-status-warning/20 text-status-warning text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {jobsWithApplicants.reduce((s, j) => s + (j.applicant_count ?? 0), 0)} yeni
              </span>
            </div>
            <div className="space-y-3">
              {jobsWithApplicants.map(j => (
                <Link key={j.id} to={`/jobs/${j.id}`}
                  className="flex items-center justify-between bg-bg-card border border-status-warning/30 hover:border-status-warning/60 rounded-xl px-5 py-4 transition-all group">
                  <div>
                    <div className="font-medium text-text-primary group-hover:text-brand-secondary transition-colors">
                      {j.title}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{j.category} · {j.budget_xlm} XLM</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-status-warning font-bold text-sm">{j.applicant_count} başvuru</div>
                      <div className="text-xs text-text-muted">inceleme bekliyor</div>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-muted fill-current">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Escrow List with Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Escrow Listesi</h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {(['tümü', 'aktif', 'bekleyen', 'tamamlanan', 'ihtilaflı'] as const).map(f => (
              <button
                key={f}
                onClick={() => setEscrowFilter(f)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                  escrowFilter === f
                    ? 'bg-brand-primary border-brand-primary text-white shadow-glow-sm'
                    : 'bg-bg-elevated border-bg-border text-text-muted hover:text-text-primary hover:border-brand-primary/40'
                }`}
              >
                {FILTER_LABELS[f]}
                {filterCounts[f] > 0 && (
                  <span className={`text-xs font-mono ${escrowFilter === f ? 'text-white/80' : 'text-text-muted'}`}>
                    {filterCounts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-44 bg-bg-card rounded-xl animate-pulse" />)}
            </div>
          ) : filteredEscrows.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEscrows.map(j => <EscrowCard key={j.id} job={j} viewerRole="client" />)}
            </div>
          ) : (
            <Card className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-text-secondary text-sm">
                {escrowFilter === 'tümü' ? 'Henüz escrow yok' : `Bu filtrede iş bulunamadı`}
              </div>
              {escrowFilter === 'tümü' && (
                <button onClick={() => setShowCreateJob(true)}
                  className="mt-3 text-sm text-brand-primary hover:underline">
                  İlk escrow'unuzu oluşturun →
                </button>
              )}
            </Card>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Son İşlemler</h2>
          </div>
          <Card padding={false}>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">Henüz işlem yok</div>
            ) : (
              <div className="divide-y divide-bg-border">
                {transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {TX_LABELS[tx.type] || tx.type}
                      </div>
                      {tx.job_title && (
                        <div className="text-xs text-text-muted">{tx.job_title}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-brand-secondary">{tx.amount_xlm.toFixed(2)} XLM</div>
                      <div className="text-xs text-text-muted">
                        {new Date(tx.created_at).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create Escrow Modal */}
      <Modal open={showCreateJob} onClose={() => { setShowCreateJob(false); setErrors({}); setAttachment(null); }} title="Escrow Oluştur" size="lg">
        <form onSubmit={handleCreateJob} className="space-y-4">

          {/* Freelancer Address */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Freelancer Stellar Adresi <span className="text-status-error">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.freelancer_address}
                onChange={e => { setForm({ ...form, freelancer_address: e.target.value }); if (errors.freelancer_address) setErrors(p => ({ ...p, freelancer_address: '' })); }}
                className={`input-field font-mono text-sm pr-10 ${errors.freelancer_address ? 'border-status-error' : form.freelancer_address.startsWith('G') && form.freelancer_address.length === 56 ? 'border-status-success' : ''}`}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                maxLength={56}
              />
              {form.freelancer_address.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {form.freelancer_address.startsWith('G') && form.freelancer_address.length === 56
                    ? <span className="text-status-success text-sm">✓</span>
                    : <span className="text-status-error text-sm">✗</span>}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              {errors.freelancer_address
                ? <p className="text-xs text-status-error">{errors.freelancer_address}</p>
                : <p className="text-xs text-text-muted">G ile başlayan 56 karakterlik Stellar genel anahtarı</p>}
              <span className={`text-xs font-mono ${form.freelancer_address.length === 56 ? 'text-status-success' : 'text-text-muted'}`}>
                {form.freelancer_address.length}/56
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              İş Başlığı <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
              className={`input-field ${errors.title ? 'border-status-error' : ''}`}
              placeholder="Örn: React Dashboard Geliştirme"
              maxLength={100}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.title
                ? <p className="text-xs text-status-error">{errors.title}</p>
                : <p className="text-xs text-text-muted">5-100 karakter</p>}
              <span className={`text-xs ${form.title.length < 5 || form.title.length > 100 ? 'text-status-error' : 'text-text-muted'}`}>
                {form.title.length}/100
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              İş Açıklaması <span className="text-status-error">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(p => ({ ...p, description: '' })); }}
              rows={4}
              className={`input-field resize-none ${errors.description ? 'border-status-error' : ''}`}
              placeholder="Projenizin detaylarını, gereksinimlerini ve beklentilerinizi açıklayın..."
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description
                ? <p className="text-xs text-status-error">{errors.description}</p>
                : <p className="text-xs text-text-muted">20-1000 karakter</p>}
              <span className={`text-xs ${form.description.length > 0 && form.description.length < 20 ? 'text-status-error' : 'text-text-muted'}`}>
                {form.description.length}/1000
              </span>
            </div>
          </div>

          {/* Category + Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Kategori <span className="text-status-error">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => { setForm({ ...form, category: e.target.value }); if (errors.category) setErrors(p => ({ ...p, category: '' })); }}
                className={`input-field ${errors.category ? 'border-status-error' : ''}`}
              >
                <option value="">Seçin...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-status-error mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Miktar (XLM) <span className="text-status-error">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.budget_xlm}
                onChange={e => { setForm({ ...form, budget_xlm: e.target.value }); if (errors.budget_xlm) setErrors(p => ({ ...p, budget_xlm: '' })); }}
                className={`input-field ${errors.budget_xlm ? 'border-status-error' : ''}`}
                placeholder="500"
              />
              {errors.budget_xlm === 'balance_insufficient' ? (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-status-warning">⚠️ Bakiyeniz yetersiz!</p>
                  <button type="button" onClick={fundFriendbot}
                    className="text-xs text-brand-accent underline hover:text-brand-accent/80 transition-colors">
                    Test XLM Al
                  </button>
                </div>
              ) : errors.budget_xlm ? (
                <p className="text-xs text-status-warning mt-1">{errors.budget_xlm}</p>
              ) : form.budget_xlm && parseFloat(form.budget_xlm) >= 1 ? (
                <p className="text-xs text-text-muted mt-1">Net: {(parseFloat(form.budget_xlm) * 0.99).toFixed(2)} XLM (%1 komisyon)</p>
              ) : null}
            </div>
          </div>

          {/* Delivery Days */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Teslim Süresi <span className="text-status-error">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['3', '7', '14', '30'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setForm({ ...form, delivery_days: d }); if (errors.delivery_days) setErrors(p => ({ ...p, delivery_days: '' })); }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.delivery_days === d
                      ? 'bg-brand-primary border-brand-primary text-white shadow-glow-sm'
                      : 'bg-bg-elevated border-bg-border text-text-secondary hover:border-brand-primary/50 hover:text-text-primary'
                  }`}
                >
                  {d} Gün
                </button>
              ))}
            </div>
            {errors.delivery_days && <p className="text-xs text-status-error mt-1">{errors.delivery_days}</p>}
            {form.delivery_days && (
              <p className="text-xs text-text-muted mt-1">
                Teslim tarihi: {(() => { const d = new Date(); d.setDate(d.getDate() + parseInt(form.delivery_days)); return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); })()}
              </p>
            )}
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Dosya Ekle <span className="text-text-muted text-xs font-normal">(opsiyonel)</span>
            </label>
            {attachment ? (
              <div className="flex items-center justify-between bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{attachment.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <div>
                    <p className="text-sm text-text-primary font-medium">{attachment.name}</p>
                    <p className="text-xs text-text-muted">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setAttachment(null)}
                  className="text-text-muted hover:text-status-error transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-all ${
                  dragOver ? 'border-brand-primary bg-brand-primary/10' : 'border-bg-border hover:border-brand-primary/50 hover:bg-bg-elevated'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0] || null); }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-text-muted fill-current">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <div className="text-center">
                  <p className="text-sm text-text-secondary">Dosyayı sürükle veya <span className="text-brand-primary">tıklayarak seç</span></p>
                  <p className="text-xs text-text-muted mt-0.5">Maks 5MB · JPG, PNG, GIF, WebP, PDF</p>
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf"
                  onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-3 text-xs text-text-muted flex items-start gap-2">
            <span className="text-base flex-shrink-0">⛓</span>
            <span>Escrow oluşturulunca Stellar ağında otomatik bir hesap açılır. Freelancer belirtilen adresiyle eşleşiyorsa hemen bildirim alır. Ödeme escrow'u finanse edip iş onaylandığında serbest bırakılır.</span>
          </div>

          {(!isConnected || sessionExpired) && (
            <p className="text-xs text-status-warning text-center -mb-1">
              ⚠️ Escrow oluşturmak için cüzdanınızı bağlayın
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" fullWidth onClick={() => { setShowCreateJob(false); setErrors({}); setAttachment(null); }}>
              İptal
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={creating}
              disabled={!isConnected || sessionExpired || !isFormValid}
            >
              {creating ? 'İşlem yapılıyor...' : 'Escrow Oluştur'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
