import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { Job, Transaction } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { sendXLMPayment, truncateAddress, getStellarExpertUrl } from '../stellar/freighter';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import WalletGate from '../components/WalletGate';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { address, isConnected, connect } = useWallet();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showDeliver, setShowDeliver] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [disputeForm, setDisputeForm] = useState({ reason: 'not_delivered', description: '' });
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);
  const [disputeDescError, setDisputeDescError] = useState('');

  useEffect(() => { loadJob(); }, [id]);

  const loadJob = async () => {
    try {
      const [jobRes, txRes] = await Promise.all([
        api.get(`/jobs/${id}`),
        api.get(`/jobs/${id}/transactions`),
      ]);
      setJob(jobRes.data);
      setTxs(txRes.data);
    } catch { toast.error('İş bulunamadı'); navigate('/jobs'); }
    finally { setLoading(false); }
  };

  const handleFundEscrow = async () => {
    if (!job) return;
    if (!isConnected || !address) {
      toast.error('Önce Freighter cüzdanını bağlayın');
      await connect();
      return;
    }
    setActionLoading(true);
    const toastId = toast.loading('Escrow finanse ediliyor...');
    try {
      const result = await sendXLMPayment(address, job.escrow_account!, job.budget_xlm.toString());
      if (result.success) {
        await api.post(`/jobs/${id}/fund`, { tx_hash: result.hash, from_address: address });
        toast.dismiss(toastId);
        toast.success(`Escrow finanse edildi! Hash: ${result.hash?.substring(0, 16)}...`);
        loadJob();
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || 'İşlem başarısız');
      }
    } catch { toast.dismiss(toastId); toast.error('Hata oluştu'); }
    finally { setActionLoading(false); }
  };

  const handleApply = async () => {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/apply`);
      toast.success('Başvuru gönderildi!');
      loadJob();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setActionLoading(false); }
  };

  const handleDeliver = async () => {
    if (!deliveryNote.trim()) { toast.error('Teslim notu ekleyin'); return; }
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/submit`, { delivery_note: deliveryNote });
      toast.success('İş teslim edildi!');
      setShowDeliver(false);
      loadJob();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    const toastId = toast.loading('Ödeme serbest bırakılıyor...');
    try {
      const r = await api.post(`/jobs/${id}/approve`);
      toast.dismiss(toastId);
      toast.success(`✅ ${r.data.payment_amount.toFixed(2)} XLM freelancer'a gönderildi!`);
      loadJob();
    } catch (err: any) { toast.dismiss(toastId); toast.error(err.response?.data?.error || 'Hata'); }
    finally { setActionLoading(false); }
  };

  const handleAcceptApplicant = async (freelancerId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${id}/accept/${freelancerId}`);
      toast.success('Freelancer kabul edildi! İş başladı.');
      loadJob();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setActionLoading(false); }
  };

  const handleDispute = async () => {
    const desc = disputeForm.description.trim();
    if (desc.length < 20) {
      setDisputeDescError(`En az 20 karakter gerekli (şu an: ${desc.length})`);
      return;
    }
    setDisputeDescError('');
    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = { job_id: id, ...disputeForm };
      if (disputeEvidence) {
        payload.evidence = { name: disputeEvidence.name, size: disputeEvidence.size, type: disputeEvidence.type };
      }
      const r = await api.post('/disputes', payload);
      toast.success('İtiraz açıldı. Para kilitli kalacak.');
      setShowDispute(false);
      setDisputeEvidence(null);
      navigate(`/disputes/${r.data.id}`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setActionLoading(false); }
  };

  const handleResolveDispute = async (resolution: 'freelancer' | 'client') => {
    if (!job?.dispute_id) return;
    setActionLoading(true);
    const toastId = toast.loading('Karar uygulanıyor...');
    try {
      await api.post(`/disputes/${job.dispute_id}/resolve`, { resolution });
      toast.dismiss(toastId);
      toast.success(resolution === 'freelancer' ? '💰 Freelancer\'a ödeme yapıldı' : '↩️ Müşteriye iade edildi');
      loadJob();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!job) return;
    const lines = [
      'FATURA / INVOICE',
      '='.repeat(44),
      `İş No      : ${job.id}`,
      `İş Başlığı : ${job.title}`,
      `Kategori   : ${job.category}`,
      '',
      `İşveren    : ${job.client_name ?? '-'}`,
      `Freelancer : ${job.freelancer_name ?? '-'}`,
      '',
      `Bütçe (Brüt)  : ${job.budget_xlm.toFixed(2)} XLM`,
      `Komisyon (%1)  : ${commission.toFixed(2)} XLM`,
      `Net Ödeme      : ${netPayment.toFixed(2)} XLM`,
      '',
      `Tamamlanma : ${job.completed_at ? new Date(job.completed_at).toLocaleDateString('tr-TR') : '-'}`,
      '='.repeat(44),
      'FreelanceChain · Stellar Testnet',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatura-${job.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg-primary pt-16 flex items-center justify-center">
      <div className="text-gray-400">Yükleniyor...</div>
    </div>
  );
  if (!job) return null;

  const isClient = user?.id === job.client_id;
  const isFreelancer = user?.id === job.freelancer_id;
  const commission = job.budget_xlm * 0.01;
  const netPayment = job.budget_xlm - commission;

  const DISPUTABLE_STATUSES = ['delivered', 'in_progress', 'SUBMITTED', 'IN_PROGRESS', 'FUNDED'];
  const APPROVABLE_STATUSES = ['delivered', 'SUBMITTED', 'APPROVED'];
  const OPEN_STATUSES = ['open', 'CREATED', 'FUNDED'];
  const DONE_STATUSES = ['completed', 'COMPLETED'];

  const canDispute = (isClient || isFreelancer) && DISPUTABLE_STATUSES.includes(job.status) && !job.dispute_id;
  const canApprove = isClient && APPROVABLE_STATUSES.includes(job.status);
  const canDeliver = isFreelancer && (
    ['IN_PROGRESS', 'in_progress'].includes(job.status) ||
    (job.status === 'FUNDED' && job.freelancer_id === user?.id)
  );
  const canApply = user?.role === 'freelancer' && OPEN_STATUSES.includes(job.status) && !job.freelancer_id && !job.has_applied;
  const canFund = isClient && !job.escrow_funded && !DONE_STATUSES.includes(job.status);
  const hasApplied = user?.role === 'freelancer' && job.has_applied && !job.freelancer_id;

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/jobs" className="hover:text-white transition-colors">İşler</Link>
          <span>/</span>
          <span className="text-white">{job.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-xl font-bold text-white">{job.title}</h1>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">{job.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="bg-bg-elevated px-3 py-1 rounded-lg">{job.category}</span>
                <span>📅 {new Date(job.created_at).toLocaleDateString('tr-TR')}</span>
                {job.deadline && <span>⏰ Son: {new Date(job.deadline).toLocaleDateString('tr-TR')}</span>}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Taraflar</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold">
                      {job.client_name?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{job.client_name || 'Müşteri'}</div>
                      <div className="text-xs text-gray-500">Müşteri</div>
                    </div>
                  </div>
                  {job.client_wallet && (
                    <code className="text-xs text-gray-500 bg-bg-elevated px-2 py-1 rounded">{truncateAddress(job.client_wallet)}</code>
                  )}
                </div>
                {job.freelancer_name ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stellar-cyan to-stellar-blue flex items-center justify-center text-white text-sm font-bold">
                        {job.freelancer_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{job.freelancer_name}</div>
                        <div className="text-xs text-gray-500">Freelancer · ⭐ {job.freelancer_reputation}</div>
                      </div>
                    </div>
                    {job.freelancer_wallet && (
                      <code className="text-xs text-gray-500 bg-bg-elevated px-2 py-1 rounded">{truncateAddress(job.freelancer_wallet)}</code>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">Freelancer atanmadı</div>
                )}
              </div>
            </div>

            {/* Applicants list — only visible to client when no freelancer assigned */}
            {isClient && !job.freelancer_id && (job.applicant_details?.length ?? 0) > 0 && (
              <div className="bg-bg-card border border-status-warning/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-status-warning uppercase tracking-wide">
                    🙋 Başvurular
                  </h3>
                  <span className="bg-status-warning/20 text-status-warning text-xs font-bold px-2 py-0.5 rounded-full">
                    {job.applicant_details!.length} başvuru
                  </span>
                </div>
                <div className="space-y-3">
                  {job.applicant_details!.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-bg-elevated rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent to-brand-secondary flex items-center justify-center text-white text-sm font-bold">
                          {a.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{a.name}</div>
                          <div className="text-xs text-gray-500">
                            ⭐ {a.reputation?.toFixed(1) ?? '5.0'} · {a.completed_jobs ?? 0} tamamlanan iş
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAcceptApplicant(a.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 bg-status-success/20 border border-status-success/40 hover:bg-status-success/30 disabled:opacity-50 text-status-success text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                      >
                        {actionLoading ? '...' : '✓ Kabul Et'}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500 bg-bg-elevated rounded-lg px-3 py-2">
                  💡 Bir freelancer kabul ettiğinizde iş başlayacak ve diğer başvurular bilgilendirilecektir.
                </div>
              </div>
            )}

            {/* Delivery Note */}
            {job.delivery_note && (
              <div className="bg-bg-card border border-brand-secondary/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-brand-secondary uppercase tracking-wide mb-3">📦 Teslim Notu</h3>
                <p className="text-gray-300 leading-relaxed">{job.delivery_note}</p>
                {job.delivered_at && (
                  <div className="text-xs text-gray-500 mt-3">
                    📅 {new Date(job.delivered_at).toLocaleString('tr-TR')}
                  </div>
                )}
              </div>
            )}

            {/* Dispute Info */}
            {job.dispute_id && (
              <div className="bg-status-error/10 border border-status-error/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-status-error uppercase tracking-wide">⚠️ Aktif İtiraz</h3>
                  <StatusBadge status={job.dispute_status || 'open'} />
                </div>
                <p className="text-sm text-gray-400 mb-3">{job.dispute_desc}</p>
                <Link to={`/disputes/${job.dispute_id}`}
                  className="inline-flex items-center gap-2 text-sm text-status-error hover:underline">
                  İtiraz detaylarını gör →
                </Link>
              </div>
            )}

            {/* Transactions */}
            {txs.length > 0 && (
              <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Blockchain İşlemleri</h3>
                <div className="space-y-3">
                  {txs.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-sm bg-bg-elevated rounded-xl px-4 py-3">
                      <div>
                        <div className="text-white font-medium capitalize">
                          {tx.type === 'escrow_fund' ? '🔒 Escrow Yüklendi' :
                           tx.type === 'release_payment' ? '✅ Ödeme Serbest' :
                           tx.type === 'refund' ? '↩️ İade' :
                           tx.type === 'partial_payment' ? '⚖️ Kısmi Ödeme' : tx.type}
                        </div>
                        {tx.stellar_tx_hash && (
                          <a href={getStellarExpertUrl(tx.stellar_tx_hash)} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-secondary hover:underline font-mono">
                            {tx.stellar_tx_hash.substring(0, 20)}...
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-brand-secondary">{tx.amount_xlm.toFixed(2)} XLM</div>
                        <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Escrow Status */}
            <div className={`bg-bg-card border rounded-2xl p-5 ${job.escrow_funded ? 'border-status-success/40' : 'border-status-warning/40'}`}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Escrow Durumu</h3>
              <div className={`flex items-center gap-2 mb-3 ${job.escrow_funded ? 'text-status-success' : 'text-status-warning'}`}>
                <div className={`w-3 h-3 rounded-full ${job.escrow_funded ? 'bg-status-success animate-pulse' : 'bg-status-warning'}`} />
                <span className="font-semibold">{job.escrow_funded ? '🔒 Finanse Edildi' : '⏳ Bekleniyor'}</span>
              </div>
              {job.escrow_account && (
                <div className="text-xs font-mono text-gray-500 bg-bg-elevated rounded-lg px-3 py-2 mb-4 break-all">
                  {job.escrow_account}
                </div>
              )}
              <div className="bg-bg-elevated rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Toplam Bütçe</span>
                  <span className="font-mono font-bold text-white">{job.budget_xlm} XLM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Komisyon (%1)</span>
                  <span className="font-mono text-gray-400">{commission.toFixed(2)} XLM</span>
                </div>
                <div className="border-t border-bg-border pt-2 flex justify-between">
                  <span className="text-gray-300 font-medium">Net Ödeme</span>
                  <span className="font-mono font-bold text-brand-secondary">{netPayment.toFixed(2)} XLM</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(() => {
              const banners: Record<string, { bg: string; color: string; icon: string; label: string; sub?: string }> = {
                CREATED:     { bg: 'bg-status-warning/10 border-b border-status-warning/20',  color: 'text-status-warning',  icon: '⏳', label: 'BEKLEMEDE',                        sub: 'Escrow henüz finanse edilmedi' },
                open:        { bg: 'bg-status-warning/10 border-b border-status-warning/20',  color: 'text-status-warning',  icon: '⏳', label: 'BEKLEMEDE',                        sub: 'Escrow henüz finanse edilmedi' },
                FUNDED:      { bg: 'bg-brand-primary/10 border-b border-brand-primary/20',    color: 'text-brand-secondary', icon: '🔵', label: 'FONLANDI — İş devam ediyor' },
                IN_PROGRESS: { bg: 'bg-brand-primary/10 border-b border-brand-primary/20',    color: 'text-brand-secondary', icon: '🔵', label: 'İŞ DEVAM EDİYOR' },
                in_progress: { bg: 'bg-brand-primary/10 border-b border-brand-primary/20',    color: 'text-brand-secondary', icon: '🔵', label: 'İŞ DEVAM EDİYOR' },
                SUBMITTED:   { bg: 'bg-status-warning/10 border-b border-status-warning/20',  color: 'text-status-warning',  icon: '🟡', label: 'TESLİM EDİLDİ — Onay bekleniyor' },
                delivered:   { bg: 'bg-status-warning/10 border-b border-status-warning/20',  color: 'text-status-warning',  icon: '🟡', label: 'TESLİM EDİLDİ — Onay bekleniyor' },
                COMPLETED:   { bg: 'bg-status-success/10 border-b border-status-success/20',  color: 'text-status-success',  icon: '✅', label: 'ÖDEME YAPILDI' },
                completed:   { bg: 'bg-status-success/10 border-b border-status-success/20',  color: 'text-status-success',  icon: '✅', label: 'ÖDEME YAPILDI' },
                DISPUTED:    { bg: 'bg-status-error/10 border-b border-status-error/20',       color: 'text-status-error',    icon: '🔴', label: 'İHTİLAFLI — Admin inceliyor' },
                disputed:    { bg: 'bg-status-error/10 border-b border-status-error/20',       color: 'text-status-error',    icon: '🔴', label: 'İHTİLAFLI — Admin inceliyor' },
              };
              const b = banners[job.status] ?? { bg: 'bg-bg-elevated', color: 'text-text-secondary', icon: 'ℹ️', label: job.status };
              return (
                <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
                  {/* Status Banner */}
                  <div className={`flex items-center gap-3 px-5 py-4 ${b.bg}`}>
                    <span className="text-xl flex-shrink-0">{b.icon}</span>
                    <div>
                      <div className={`font-bold text-sm tracking-wide ${b.color}`}>{b.label}</div>
                      {b.sub && <div className="text-xs text-text-muted mt-0.5">{b.sub}</div>}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">

                    {/* Durum 4 — COMPLETED */}
                    {DONE_STATUSES.includes(job.status) && (
                      <>
                        <p className="text-center text-sm text-text-secondary py-1">İş başarıyla tamamlandı 🎉</p>
                        <button onClick={handleDownloadInvoice}
                          className="w-full flex items-center justify-center gap-2 bg-bg-elevated border border-bg-border hover:bg-bg-card text-text-secondary py-3 rounded-xl font-medium transition-all text-sm">
                          📄 Fatura İndir
                        </button>
                      </>
                    )}

                    {/* Durum 1 — CREATED / open (not funded) */}
                    {['CREATED', 'open'].includes(job.status) && (
                      <WalletGate>
                        {canFund && (
                          <button onClick={handleFundEscrow} disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 bg-status-success/20 border border-status-success/40 hover:bg-status-success/30 text-status-success py-3 rounded-xl font-semibold transition-all disabled:opacity-50">
                            {actionLoading
                              ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />İşleniyor...</>
                              : <><span>💰</span>Parayı Yatır ({job.budget_xlm} XLM)</>}
                          </button>
                        )}
                        {canApply && (
                          <button onClick={handleApply} disabled={actionLoading}
                            className="w-full bg-brand-primary/20 border border-brand-primary/50 hover:bg-brand-primary/30 text-brand-secondary py-3 rounded-xl font-medium transition-all disabled:opacity-50">
                            🙋 Başvur
                          </button>
                        )}
                        {hasApplied && (
                          <div className="w-full flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent py-3 rounded-xl text-sm font-medium">
                            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                            Başvurunuz İnceleniyor
                          </div>
                        )}
                        {!canFund && !canApply && !hasApplied && (
                          <div className="text-sm text-text-muted text-center py-2">Bu aşamada yapılacak işlem yok</div>
                        )}
                      </WalletGate>
                    )}

                    {/* Durum 2 — FUNDED / IN_PROGRESS */}
                    {['FUNDED', 'IN_PROGRESS', 'in_progress'].includes(job.status) && (
                      <WalletGate>
                        {isClient && (
                          canDispute
                            ? <button onClick={() => setShowDispute(true)}
                                className="w-full bg-status-error/10 border border-status-error/30 hover:bg-status-error/20 text-status-error py-3 rounded-xl font-medium transition-all">
                                ❌ İtiraz Et
                              </button>
                            : <div className="text-sm text-text-muted text-center py-2">Freelancer bekleniyor</div>
                        )}
                        {isFreelancer && (
                          <>
                            {canDeliver && (
                              <button onClick={() => setShowDeliver(true)}
                                className="w-full bg-stellar-cyan/20 border border-stellar-cyan/40 hover:bg-stellar-cyan/30 text-stellar-cyan py-3 rounded-xl font-semibold transition-all">
                                📦 Teslim Et
                              </button>
                            )}
                            {!job.dispute_id && (
                              <button onClick={() => setShowDispute(true)}
                                className="w-full bg-status-error/10 border border-status-error/30 hover:bg-status-error/20 text-status-error py-2.5 rounded-xl text-sm font-medium transition-all">
                                ⚠️ İtiraz Et
                              </button>
                            )}
                          </>
                        )}
                        {!isClient && !isFreelancer && (
                          <div className="text-sm text-text-muted text-center py-2">Sadece taraflar aksiyon alabilir</div>
                        )}
                      </WalletGate>
                    )}

                    {/* Durum 3 — SUBMITTED / delivered */}
                    {['SUBMITTED', 'delivered'].includes(job.status) && (
                      <WalletGate>
                        {isClient && (
                          <>
                            <button onClick={handleApprove} disabled={actionLoading}
                              className="w-full bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all shadow-glow-sm">
                              {actionLoading ? '⏳ İşleniyor...' : '✅ Onayla'}
                            </button>
                            {canDispute && (
                              <button onClick={() => setShowDispute(true)}
                                className="w-full bg-status-error/10 border border-status-error/30 hover:bg-status-error/20 text-status-error py-3 rounded-xl font-medium transition-all">
                                ❌ Reddet
                              </button>
                            )}
                          </>
                        )}
                        {isFreelancer && (
                          <>
                            <button disabled
                              className="w-full flex items-center justify-center gap-2 bg-bg-elevated border border-bg-border text-text-muted py-3 rounded-xl font-medium cursor-not-allowed opacity-60">
                              <div className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                              İşveren onayı bekleniyor
                            </button>
                            {job.delivered_at && (() => {
                              const autoDate = new Date(new Date(job.delivered_at).getTime() + 7 * 24 * 60 * 60 * 1000);
                              return (
                                <div className="text-xs text-text-muted bg-bg-elevated rounded-lg px-3 py-2 flex items-center gap-1.5">
                                  <span>⏰</span>
                                  <span>Zaman aşımı: {autoDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde otomatik ödeme</span>
                                </div>
                              );
                            })()}
                          </>
                        )}
                        {!isClient && !isFreelancer && (
                          <div className="text-sm text-text-muted text-center py-2">Sadece taraflar aksiyon alabilir</div>
                        )}
                      </WalletGate>
                    )}

                    {/* Durum 5 — DISPUTED */}
                    {['DISPUTED', 'disputed'].includes(job.status) && (
                      <>
                        <div className="bg-status-error/5 border border-status-error/20 rounded-xl px-4 py-3 text-sm text-text-secondary text-center">
                          Admin incelemesi 3 gün içinde sonuçlanır
                        </div>
                        {user?.role === 'admin' && (
                          <div className="space-y-2 pt-1">
                            <div className="text-xs text-text-muted text-center font-medium uppercase tracking-wide">Admin Kararı</div>
                            <button
                              onClick={() => handleResolveDispute('freelancer')}
                              disabled={actionLoading}
                              className="w-full flex items-center justify-center gap-2 bg-status-success/20 border border-status-success/40 hover:bg-status-success/30 text-status-success py-3 rounded-xl font-semibold transition-all disabled:opacity-50">
                              {actionLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '💰'}
                              Freelancer'a Öde
                            </button>
                            <button
                              onClick={() => handleResolveDispute('client')}
                              disabled={actionLoading}
                              className="w-full flex items-center justify-center gap-2 bg-bg-elevated border border-bg-border hover:bg-bg-card text-text-secondary py-3 rounded-xl font-medium transition-all disabled:opacity-50">
                              ↩️ Müşteriye İade Et
                            </button>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </div>
              );
            })()}

            {/* Network Info */}
            <div className="bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                <span className="text-gray-400">Stellar Testnet</span>
              </div>
              <div>Tüm işlemler Stellar blockchain'inde kaydedilir</div>
            </div>
          </div>
        </div>
      </div>

      {/* Deliver Modal */}
      <Modal open={showDeliver} onClose={() => setShowDeliver(false)} title="İşi Teslim Et">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Teslim Notu</label>
            <textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} rows={4}
              className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors resize-none"
              placeholder="Teslim ettiğiniz işin detaylarını açıklayın..." />
          </div>
          <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-3 text-xs text-gray-400">
            ℹ️ Teslimden sonra müşteri 7 gün içinde onaylayabilir veya itiraz açabilir.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowDeliver(false)} className="flex-1 bg-bg-elevated border border-bg-border text-gray-300 py-3 rounded-xl font-medium hover:bg-bg-card transition-all">İptal</button>
            <button onClick={handleDeliver} disabled={actionLoading}
              className="flex-1 bg-stellar-cyan/20 border border-stellar-cyan/40 hover:bg-stellar-cyan/30 text-stellar-cyan py-3 rounded-xl font-medium transition-all disabled:opacity-50">
              {actionLoading ? '...' : '📦 Teslim Et'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal open={showDispute} onClose={() => { setShowDispute(false); setDisputeDescError(''); setDisputeEvidence(null); }} title="İtiraz Aç">
        <div className="space-y-4">
          <div className="bg-status-error/10 border border-status-error/30 rounded-xl p-4 text-sm text-status-error">
            ⚠️ İtiraz açılırsa <strong>{job.budget_xlm} XLM</strong> kilitli kalacak ve admin incelemesi gerekecektir.
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              İtiraz Sebebi <span className="text-status-error">*</span>
            </label>
            <select
              value={disputeForm.reason}
              onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })}
              className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
            >
              <option value="not_delivered">İş teslim edilmedi</option>
              <option value="poor_quality">İş kalitesiz / beğenmedim</option>
              <option value="incomplete">Eksik teslim</option>
              <option value="communication">İletişim sorunu</option>
            </select>
            <p className="text-xs text-text-muted mt-1">
              {{
                not_delivered: 'Freelancer hâlâ işi yapmadı',
                poor_quality:  'Yapıldı ama kalitesiz',
                incomplete:    'İşin bir kısmı yapılmadı',
                communication: 'Freelancer cevap vermiyor',
              }[disputeForm.reason]}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Detaylı Açıklama <span className="text-status-error">*</span>
            </label>
            <textarea
              value={disputeForm.description}
              onChange={e => {
                setDisputeForm({ ...disputeForm, description: e.target.value });
                if (disputeDescError) setDisputeDescError('');
              }}
              rows={4}
              maxLength={1000}
              className={`w-full bg-bg-elevated border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors resize-none ${
                disputeDescError ? 'border-status-error' : 'border-bg-border focus:border-brand-primary'
              }`}
              placeholder="İtiraz gerekçenizi ayrıntılı açıklayın..."
            />
            <div className="flex items-center justify-between mt-1">
              {disputeDescError
                ? <p className="text-xs text-status-error">{disputeDescError}</p>
                : <p className="text-xs text-text-muted">En az 20 karakter</p>}
              <span className={`text-xs font-mono ${disputeForm.description.length < 20 && disputeForm.description.length > 0 ? 'text-status-error' : 'text-text-muted'}`}>
                {disputeForm.description.length}/1000
              </span>
            </div>
          </div>

          {/* Evidence file — optional */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Kanıt Dosyası <span className="text-text-muted text-xs font-normal">(opsiyonel)</span>
            </label>
            {disputeEvidence ? (
              <div className="flex items-center justify-between bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{disputeEvidence.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{disputeEvidence.name}</p>
                    <p className="text-xs text-gray-400">{(disputeEvidence.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setDisputeEvidence(null)}
                  className="text-gray-400 hover:text-status-error transition-colors text-lg leading-none">×</button>
              </div>
            ) : (
              <label className="flex items-center gap-3 border border-dashed border-bg-border hover:border-brand-primary/50 hover:bg-bg-elevated rounded-xl px-4 py-3 cursor-pointer transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-muted fill-current flex-shrink-0">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <div>
                  <p className="text-sm text-text-secondary">Ekran görüntüsü veya belge yükle</p>
                  <p className="text-xs text-text-muted">Maks 5MB · JPG, PNG, PDF</p>
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { toast.error('Dosya 5MB\'dan büyük olamaz'); return; }
                    setDisputeEvidence(f);
                  }} />
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowDispute(false); setDisputeDescError(''); setDisputeEvidence(null); }}
              className="flex-1 bg-bg-elevated border border-bg-border text-gray-300 py-3 rounded-xl font-medium hover:bg-bg-card transition-all">
              İptal
            </button>
            <button onClick={handleDispute} disabled={actionLoading || disputeForm.description.trim().length < 20}
              className="flex-1 bg-status-error/20 border border-status-error/40 hover:bg-status-error/30 text-status-error py-3 rounded-xl font-medium transition-all disabled:opacity-50">
              {actionLoading ? '...' : '⚠️ İtiraz Aç'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
