import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { Job, Transaction } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { truncateAddress } from '../../stellar/freighter';
import JobCard from '../../components/JobCard';
import EscrowCard from '../../components/EscrowCard';
import Card from '../../components/ui/Card';

const TX_LABELS: Record<string, string> = {
  escrow_fund: 'Escrow Yatırma',
  release_payment: 'Ödeme Alındı',
  refund: 'İade',
  partial_payment: 'Kısmi Ödeme',
};

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const { address, isConnected, xlmBalance, connect, disconnect, fundFriendbot, refreshBalance, sessionExpired, minutesLeft } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [escrowFilter, setEscrowFilter] = useState<'tümü' | 'aktif' | 'bekleyen' | 'tamamlanan' | 'ihtilaflı'>('tümü');

  useEffect(() => {
    loadData();
    if (address) refreshBalance();
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

  const handleApply = async (jobId: string) => {
    setApplying(jobId);
    try {
      await api.post(`/jobs/${jobId}/apply`);
      toast.success('Başvurunuz alındı!');
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Başvuru başarısız');
    } finally {
      setApplying(null);
    }
  };

  const myActiveJobs = jobs.filter(j =>
    j.freelancer_id === user?.id &&
    ['IN_PROGRESS', 'in_progress', 'SUBMITTED', 'delivered'].includes(j.status)
  );
  const myCompletedJobs = jobs.filter(j =>
    j.freelancer_id === user?.id && ['COMPLETED', 'completed'].includes(j.status)
  );
  const myDisputedJobs = jobs.filter(j =>
    j.freelancer_id === user?.id && ['DISPUTED', 'disputed'].includes(j.status)
  );
  const myPendingJobs = jobs.filter(j =>
    j.freelancer_id === user?.id && ['CREATED', 'FUNDED'].includes(j.status)
  );
  const myApplications = jobs.filter(j => j.has_applied && !j.freelancer_id);
  const availableJobs = jobs.filter(j =>
    ['open', 'CREATED', 'FUNDED'].includes(j.status) && !j.freelancer_id && !j.has_applied
  );
  const totalEarned = user?.total_earned ?? 0;
  const earnedTransactions = transactions.filter(t => t.type === 'release_payment' || t.type === 'partial_payment');

  // All escrows I'm involved in (assigned)
  const allMyEscrows = jobs.filter(j => j.freelancer_id === user?.id);

  const filteredEscrows = allMyEscrows.filter(j => {
    switch (escrowFilter) {
      case 'aktif':      return myActiveJobs.includes(j);
      case 'bekleyen':   return myPendingJobs.includes(j);
      case 'tamamlanan': return myCompletedJobs.includes(j);
      case 'ihtilaflı':  return myDisputedJobs.includes(j);
      default:           return true;
    }
  });

  const filterCounts = {
    tümü: allMyEscrows.length,
    aktif: myActiveJobs.length,
    bekleyen: myPendingJobs.length,
    tamamlanan: myCompletedJobs.length,
    ihtilaflı: myDisputedJobs.length,
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
              👨‍💻 Freelancer Paneli · Stellar Testnet
            </p>
          </div>
          <Link to="/jobs"
            className="flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/50 hover:bg-brand-primary/30 text-brand-secondary rounded-xl px-4 py-2 text-sm font-medium transition-all">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            Tüm İşleri Gör
          </Link>
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
              value: myActiveJobs.length, sub: 'devam ediyor', textColor: 'text-status-warning',
            },
            {
              icon: '✅', color: 'bg-status-success/20',
              label: 'Tamamlanan',
              value: user?.completed_jobs ?? myCompletedJobs.length, sub: 'proje', textColor: 'text-status-success',
            },
            {
              icon: '📈', color: 'bg-status-success/20',
              label: 'Toplam Kazanç',
              value: `${totalEarned.toLocaleString()} XLM`, sub: 'kazanıldı', textColor: 'text-status-success',
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

        {/* My Applications — pending review */}
        {myApplications.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-heading text-lg font-semibold text-text-primary">Başvurularım</h2>
              <span className="bg-brand-accent/20 text-brand-accent text-xs font-bold px-2 py-0.5 rounded-full">
                {myApplications.length} bekliyor
              </span>
            </div>
            <div className="space-y-3">
              {myApplications.map(j => (
                <Link key={j.id} to={`/jobs/${j.id}`}
                  className="flex items-center justify-between bg-bg-card border border-brand-accent/30 hover:border-brand-accent/60 rounded-xl px-5 py-4 transition-all group">
                  <div>
                    <div className="font-medium text-text-primary group-hover:text-brand-secondary transition-colors">
                      {j.title}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{j.category} · {j.budget_xlm} XLM</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-brand-accent text-xs font-medium">Yanıt Bekleniyor</div>
                      <div className="text-xs text-text-muted">{j.applicant_count} toplam başvuru</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Available Jobs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Başvurulabilir İşler
              <span className="ml-2 text-xs bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full">
                {availableJobs.length}
              </span>
            </h2>
            <Link to="/jobs" className="text-sm text-brand-secondary hover:underline">Tümünü gör →</Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : availableJobs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableJobs.slice(0, 6).map(j => (
                <div key={j.id} className="relative">
                  <JobCard job={j} />
                  <div className="absolute bottom-4 right-4">
                    <button
                      onClick={() => handleApply(j.id)}
                      disabled={applying === j.id}
                      className="text-xs bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                    >
                      {applying === j.id ? (
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : null}
                      Başvur
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-text-secondary">Şu an uygun iş yok</div>
            </Card>
          )}
        </div>

        {/* My Escrow List with Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Escrow'larım</h2>
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

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-44 bg-bg-card rounded-xl animate-pulse" />)}
            </div>
          ) : filteredEscrows.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEscrows.map(j => <EscrowCard key={j.id} job={j} viewerRole="freelancer" />)}
            </div>
          ) : (
            <Card className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-text-secondary text-sm">
                {escrowFilter === 'tümü' ? 'Henüz atandığınız escrow yok' : 'Bu filtrede iş bulunamadı'}
              </div>
            </Card>
          )}
        </div>

        {/* Earnings History */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-text-primary">Kazanç Geçmişi</h2>
          </div>
          <Card padding={false}>
            {earnedTransactions.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">Henüz kazanç yok</div>
            ) : (
              <div className="divide-y divide-bg-border">
                {earnedTransactions.slice(0, 5).map(tx => (
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
                      <div className="font-mono text-sm text-status-success">+{tx.amount_xlm.toFixed(2)} XLM</div>
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
    </div>
  );
}
