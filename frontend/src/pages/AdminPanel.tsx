import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { Dispute, Transaction } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { truncateAddress } from '../stellar/freighter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Tab = 'overview' | 'disputes' | 'users' | 'jobs' | 'transactions';
type DisputeFilter = 'all' | 'open' | 'reviewing' | 'resolved';

interface Stats {
  total_users: number; total_clients: number; total_freelancers: number;
  total_jobs: number; open_jobs: number; in_progress_jobs: number;
  completed_jobs: number; disputed_jobs: number; open_disputes: number;
  submitted_jobs: number; reported_users: number;
  total_volume_xlm: number; commission_earned: number; recent_transactions: Transaction[];
}

const REASON_LABELS: Record<string, string> = {
  not_delivered: 'Teslim edilmedi',
  poor_quality: 'Kalitesiz iş',
  bad_quality: 'Kalitesiz iş',
  incomplete: 'Eksik teslim',
  communication: 'İletişim sorunu',
};

export default function AdminPanel() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputeFilter, setDisputeFilter] = useState<DisputeFilter>('open');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, disputesRes, usersRes, jobsRes, txsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/disputes'),
        api.get('/admin/users'),
        api.get('/admin/jobs'),
        api.get('/admin/transactions'),
      ]);
      setStats(statsRes.data);
      setDisputes(disputesRes.data);
      setUsers(usersRes.data);
      setJobs(jobsRes.data);
      setTxs(txsRes.data);
    } catch { toast.error('Veri yüklenemedi'); }
    finally { setLoading(false); }
  };

  const handleResolve = async (disputeId: string, resolution: 'freelancer' | 'client') => {
    const key = `${disputeId}_${resolution === 'freelancer' ? 'fl' : 'cl'}`;
    setResolvingId(key);
    try {
      await api.post(`/admin/disputes/${disputeId}/resolve`, { resolution });
      toast.success(resolution === 'freelancer' ? '💰 Freelancer\'a ödeme yapıldı' : '↩️ Müşteriye iade edildi');
      const [disputesRes, statsRes] = await Promise.all([
        api.get('/admin/disputes'),
        api.get('/admin/stats'),
      ]);
      setDisputes(disputesRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Hata oluştu');
    } finally {
      setResolvingId(null);
    }
  };

  const handleNotify = async (disputeId: string) => {
    setNotifyingId(disputeId);
    try {
      await api.post(`/admin/disputes/${disputeId}/notify`);
      toast.success('💬 Her iki tarafa bildirim gönderildi');
    } catch {
      toast.error('Bildirim gönderilemedi');
    } finally {
      setNotifyingId(null);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Genel Bakış', icon: '📊' },
    { key: 'disputes', label: 'İtirazlar', icon: '⚖️' },
    { key: 'users', label: 'Kullanıcılar', icon: '👥' },
    { key: 'jobs', label: 'İşler', icon: '💼' },
    { key: 'transactions', label: 'İşlemler', icon: '💸' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-bg-primary pt-16 flex items-center justify-center">
      <div className="text-gray-400">Admin paneli yükleniyor...</div>
    </div>
  );

  const jobStatusData = stats ? [
    { name: 'Açık', value: stats.open_jobs, color: '#3498db' },
    { name: 'Devam', value: stats.in_progress_jobs, color: '#fdcb6e' },
    { name: 'Tamamlandı', value: stats.completed_jobs, color: '#00b894' },
    { name: 'İtirazda', value: stats.disputed_jobs, color: '#d63031' },
  ] : [];

  const filteredDisputes = disputes.filter(d => {
    if (disputeFilter === 'all') return true;
    if (disputeFilter === 'open') return ['OPEN', 'open'].includes(d.status);
    if (disputeFilter === 'reviewing') return d.status === 'REVIEWING';
    if (disputeFilter === 'resolved') return ['RESOLVED', 'resolved'].includes(d.status);
    return true;
  });

  const openDisputeCount = disputes.filter(d => ['OPEN', 'open'].includes(d.status)).length;

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">🔑 Admin Paneli</h1>
            <p className="text-gray-400 text-sm mt-1">FreelanceChain Platform Yönetimi</p>
          </div>
          <div className="flex items-center gap-2 bg-bg-elevated border border-status-success/30 rounded-lg px-3 py-1.5 text-xs text-status-success">
            <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            Stellar Testnet · Aktif
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-bg-elevated border border-bg-border rounded-xl p-1 mb-8 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {t.icon} {t.label}
              {t.key === 'disputes' && openDisputeCount > 0 && (
                <span className="bg-status-error text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{openDisputeCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">

            {/* Bekleyen İşlemler */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>⏳</span> Bekleyen İşlemler
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Bekleyen İtirazlar',
                    value: stats.open_disputes,
                    icon: '⚖️',
                    color: 'text-status-error',
                    border: 'border-status-error/25',
                    action: () => { setTab('disputes'); setDisputeFilter('open'); },
                  },
                  {
                    label: 'Onay Bekleyen Escrow\'lar',
                    value: stats.submitted_jobs,
                    icon: '📦',
                    color: 'text-status-warning',
                    border: 'border-status-warning/25',
                    action: () => setTab('jobs'),
                  },
                  {
                    label: 'Raporlanan Kullanıcılar',
                    value: stats.reported_users,
                    icon: '🚨',
                    color: 'text-brand-accent',
                    border: 'border-brand-accent/25',
                    action: () => setTab('users'),
                  },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className={`flex items-center justify-between bg-bg-elevated border ${item.border} rounded-xl px-4 py-4 hover:bg-bg-border/40 transition-all group text-left`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors leading-snug">{item.label}</span>
                    </div>
                    <span className={`font-black text-2xl ${item.color} ml-4 flex-shrink-0`}>{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Toplam Hacim', value: `${(stats.total_volume_xlm || 0).toLocaleString()} XLM`, icon: '💎', color: 'text-brand-secondary' },
                { label: 'Komisyon Geliri', value: `${(stats.commission_earned || 0).toFixed(2)} XLM`, icon: '💰', color: 'text-status-success' },
                { label: 'Toplam Kullanıcı', value: stats.total_users, icon: '👥', color: 'text-stellar-cyan' },
                { label: 'Açık İtiraz', value: stats.open_disputes, icon: '⚠️', color: 'text-status-error' },
              ].map((m, i) => (
                <div key={i} className="bg-bg-card border border-bg-border rounded-2xl p-5">
                  <div className="text-2xl mb-2">{m.icon}</div>
                  <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">İş Durumu Dağılımı</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={jobStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {jobStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#14142a', border: '1px solid #252545', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Platform İstatistikleri</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Müşteri', val: stats.total_clients },
                    { name: 'Freelancer', val: stats.total_freelancers },
                    { name: 'Açık', val: stats.open_jobs },
                    { name: 'Devam', val: stats.in_progress_jobs },
                    { name: 'Tamamlandı', val: stats.completed_jobs },
                  ]}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#14142a', border: '1px solid #252545', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="val" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Son İşlemler</h3>
              <div className="space-y-2">
                {stats.recent_transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-4 py-3 text-sm">
                    <div>
                      <span className="text-white font-medium">
                        {tx.type === 'escrow_fund' ? '🔒 Escrow' : tx.type === 'release_payment' ? '✅ Ödeme' : tx.type === 'refund' ? '↩️ İade' : tx.type}
                      </span>
                      {tx.stellar_tx_hash && <div className="text-xs text-gray-500 font-mono">{tx.stellar_tx_hash.substring(0, 20)}...</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-brand-secondary">{tx.amount_xlm.toFixed(2)} XLM</div>
                      <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DISPUTES TAB ── */}
        {tab === 'disputes' && (
          <div className="space-y-5">
            {/* Header + filter row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold text-white">
                İtiraz Yönetimi
                <span className="ml-2 text-sm font-normal text-gray-400">({openDisputeCount} açık)</span>
              </h2>
              <div className="flex items-center gap-1 bg-bg-elevated border border-bg-border rounded-xl p-1">
                {([
                  ['all', 'Tümü'] as const,
                  ['open', 'Açık'] as const,
                  ['reviewing', 'İncelemede'] as const,
                  ['resolved', 'Çözüldü'] as const,
                ]).map(([key, label]) => (
                  <button key={key} onClick={() => setDisputeFilter(key)}
                    className={`relative text-xs px-3 py-1.5 rounded-lg transition-all ${disputeFilter === key ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}>
                    {label}
                    {key === 'open' && openDisputeCount > 0 && (
                      <span className="ml-1 bg-status-error text-white text-[10px] rounded-full px-1">{openDisputeCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filteredDisputes.length === 0 ? (
              <div className="bg-bg-card border border-bg-border rounded-2xl px-6 py-12 text-center text-gray-400">
                <div className="text-3xl mb-3">⚖️</div>
                <p className="text-sm">Bu kategoride itiraz yok</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredDisputes.map(d => {
                  const isResolved = ['RESOLVED', 'resolved'].includes(d.status);
                  const openerRole = d.opened_by_role === 'client' ? 'Müşteri' : 'Freelancer';
                  const openerWallet = d.opened_by_role === 'client' ? d.client_wallet : d.freelancer_wallet;

                  return (
                    <div key={d.id}
                      className={`bg-bg-card border rounded-2xl overflow-hidden flex flex-col transition-opacity ${isResolved ? 'border-bg-border opacity-70' : 'border-status-error/30'}`}>

                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-bg-elevated border-b border-bg-border">
                        <div className="flex items-center gap-2">
                          <span>⚖️</span>
                          <span className="font-mono text-text-muted text-xs font-bold tracking-widest">
                            İTİRAZ #{d.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <StatusBadge status={d.status} size="xs" />
                      </div>

                      {/* Card body */}
                      <div className="p-5 space-y-3 flex-1">

                        {/* Job + Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">İş</p>
                            <p className="text-text-primary font-semibold text-sm line-clamp-1">{d.job_title}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Miktar</p>
                            <p className="font-mono font-bold text-brand-secondary text-sm">{d.budget_xlm} XLM</p>
                          </div>
                        </div>

                        {/* İtiraz Eden */}
                        <div className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 mt-px">👤</span>
                          <div>
                            <span className="text-text-muted">İtiraz Eden: </span>
                            <span className="text-text-primary font-medium">{openerRole}</span>
                            {openerWallet && (
                              <span className="text-text-muted font-mono ml-1">
                                ({truncateAddress(openerWallet, 6)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sebep + Description */}
                        <div className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 mt-px">📝</span>
                          <div>
                            <span className="text-text-muted">Sebep: </span>
                            <span className="text-text-primary font-medium">{REASON_LABELS[d.reason] ?? d.reason}</span>
                            <p className="text-text-secondary italic mt-1 line-clamp-2 leading-relaxed">
                              "{d.description}"
                            </p>
                          </div>
                        </div>

                        {/* Kanıt */}
                        {d.evidence && (
                          <div className="flex items-center gap-2 text-xs">
                            <span>📎</span>
                            <span className="text-text-secondary">{d.evidence.name}</span>
                            <span className="text-text-muted">({(d.evidence.size / 1024).toFixed(0)} KB)</span>
                          </div>
                        )}

                        {/* Freelancer Cevabı */}
                        <div className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 mt-px">👨‍💻</span>
                          <div>
                            <span className="text-text-muted">Freelancer Cevabı: </span>
                            {d.freelancer_response ? (
                              <p className="text-text-secondary italic mt-1 line-clamp-2 leading-relaxed">
                                "{d.freelancer_response}"
                              </p>
                            ) : (
                              <span className="text-text-muted italic">Yanıt bekleniyor...</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-5 pb-5">
                        {isResolved ? (
                          <div className="bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-xs text-text-muted text-center">
                            ✅{' '}
                            {d.resolution === 'freelancer' ? 'Freelancer lehine çözüldü'
                              : d.resolution === 'client' ? 'Müşteri lehine iade edildi'
                              : `Kısmi çözüm (%${d.partial_percent})`}
                            {d.resolved_at && (
                              <span className="ml-1">· {new Date(d.resolved_at).toLocaleDateString('tr-TR')}</span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResolve(d.id, 'freelancer')}
                                disabled={resolvingId !== null}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-status-success/10 border border-status-success/30 text-status-success text-xs font-semibold py-2.5 rounded-xl hover:bg-status-success/20 transition-all disabled:opacity-50"
                              >
                                {resolvingId === `${d.id}_fl`
                                  ? <span className="w-3 h-3 border-2 border-status-success border-t-transparent rounded-full animate-spin" />
                                  : '💰'
                                }
                                Freelancer'a Öde
                              </button>
                              <button
                                onClick={() => handleResolve(d.id, 'client')}
                                disabled={resolvingId !== null}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-status-error/10 border border-status-error/30 text-status-error text-xs font-semibold py-2.5 rounded-xl hover:bg-status-error/20 transition-all disabled:opacity-50"
                              >
                                {resolvingId === `${d.id}_cl`
                                  ? <span className="w-3 h-3 border-2 border-status-error border-t-transparent rounded-full animate-spin" />
                                  : '↩️'
                                }
                                Müşteriye İade Et
                              </button>
                            </div>
                            <button
                              onClick={() => handleNotify(d.id)}
                              disabled={notifyingId === d.id}
                              className="w-full flex items-center justify-center gap-1.5 bg-bg-elevated border border-bg-border text-text-secondary text-xs font-semibold py-2.5 rounded-xl hover:border-brand-primary/40 hover:text-brand-primary transition-all disabled:opacity-50"
                            >
                              {notifyingId === d.id
                                ? <span className="w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                                : '💬'
                              }
                              Mesaj Gönder
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-elevated">
                    {['Ad', 'Rol', 'Cüzdan', 'Kazanç/Harcama', 'İtibar', 'Kayıt'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wide px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xs font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <span className="text-white font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          u.role === 'admin'
                            ? 'text-brand-accent border-brand-accent/30 bg-brand-accent/10'
                            : u.role === 'client'
                            ? 'text-brand-secondary border-brand-secondary/30 bg-brand-secondary/10'
                            : 'text-stellar-cyan border-stellar-cyan/30 bg-stellar-cyan/10'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'client' ? 'Müşteri' : 'Freelancer'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {u.wallet_address ? `${u.wallet_address.substring(0, 8)}...` : '-'}
                      </td>
                      <td className="px-5 py-3 text-brand-secondary font-mono text-xs">
                        {u.role === 'freelancer' ? `${(u.total_earned || 0).toFixed(0)} XLM` : `${(u.total_spent || 0).toFixed(0)} XLM`}
                      </td>
                      <td className="px-5 py-3 text-status-warning">⭐ {u.reputation}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {tab === 'jobs' && (
          <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-elevated">
                    {['İş', 'Müşteri', 'Freelancer', 'Bütçe', 'Durum', 'Tarih'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wide px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {jobs.map(j => (
                    <tr key={j.id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/jobs/${j.id}`} className="text-white font-medium hover:text-brand-secondary transition-colors line-clamp-1">{j.title}</Link>
                        <div className="text-xs text-gray-500">{j.category}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{j.client_name}</td>
                      <td className="px-5 py-3 text-gray-400">{j.freelancer_name || '-'}</td>
                      <td className="px-5 py-3 font-mono text-brand-secondary">{j.budget_xlm} XLM</td>
                      <td className="px-5 py-3"><StatusBadge status={j.status} size="xs" /></td>
                      <td className="px-5 py-3 text-xs text-gray-500">{new Date(j.created_at).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-elevated">
                    {['Tür', 'İş', 'Miktar', 'Tx Hash', 'Durum', 'Tarih'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wide px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {txs.map(tx => (
                    <tr key={tx.id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">
                        {tx.type === 'escrow_fund' ? '🔒 Escrow'
                          : tx.type === 'release_payment' ? '✅ Ödeme'
                          : tx.type === 'refund' ? '↩️ İade'
                          : tx.type === 'partial_payment' ? '⚖️ Kısmi'
                          : tx.type}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{tx.job_title || '-'}</td>
                      <td className="px-5 py-3 font-mono text-brand-secondary">{tx.amount_xlm.toFixed(2)} XLM</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {tx.stellar_tx_hash ? `${tx.stellar_tx_hash.substring(0, 16)}...` : '-'}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={tx.status} size="xs" /></td>
                      <td className="px-5 py-3 text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
