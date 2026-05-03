import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { Dispute } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function DisputeDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [resolution, setResolution] = useState<'freelancer' | 'client' | 'partial'>('freelancer');
  const [partialPercent, setPartialPercent] = useState(50);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    api.get(`/disputes/${id}`).then(r => setDispute(r.data)).catch(() => toast.error('Yüklenemedi')).finally(() => setLoading(false));
  }, [id]);

  const handleRespond = async () => {
    if (!response.trim()) { toast.error('Cevap boş olamaz'); return; }
    setResponding(true);
    try {
      await api.post(`/disputes/${id}/respond`, { response });
      toast.success('Cevabınız gönderildi');
      setDispute(prev => prev ? { ...prev, freelancer_response: response } : null);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setResponding(false); }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const r = await api.post(`/disputes/${id}/resolve`, {
        resolution,
        partial_percent: resolution === 'partial' ? partialPercent : undefined,
      });
      toast.success(`Karar verildi: ${r.data.freelancerAmount?.toFixed(2) || 0} XLM freelancer + ${r.data.clientRefund?.toFixed(2) || 0} XLM iade`);
      setShowResolve(false);
      api.get(`/disputes/${id}`).then(r => setDispute(r.data));
    } catch (err: any) { toast.error(err.response?.data?.error || 'Hata'); }
    finally { setResolving(false); }
  };

  const REASON_LABELS: Record<string, string> = {
    not_delivered: 'İş teslim edilmedi',
    poor_quality:  'İş kalitesiz / beğenmedim',
    incomplete:    'Eksik teslim',
    bad_quality:   'Kalitesiz iş',
    communication: 'İletişim sorunu',
  };

  if (loading) return <div className="min-h-screen bg-bg-primary pt-16 flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!dispute) return null;

  const isFreelancer = user?.id === dispute.freelancer_id;
  const isAdmin = user?.role === 'admin';
  const isResolved = ['resolved', 'RESOLVED'].includes(dispute.status);
  const budget = dispute.budget_xlm || 0;
  const freelancerAmount = resolution === 'partial' ? (budget * 0.99 * partialPercent / 100) : resolution === 'freelancer' ? budget * 0.99 : 0;
  const clientRefund = resolution === 'partial' ? (budget * (1 - partialPercent / 100)) : resolution === 'client' ? budget : 0;

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/disputes" className="hover:text-white transition-colors">İtirazlar</Link>
          <span>/</span>
          <span className="text-white">{dispute.job_title}</span>
        </div>

        {/* Header */}
        <div className="bg-bg-card border border-status-error/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">⚠️ İtiraz: {dispute.job_title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{REASON_LABELS[dispute.reason] || dispute.reason}</span>
                <span>·</span>
                <span>📅 {new Date(dispute.opened_at).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
            <StatusBadge status={dispute.status} />
          </div>

          <div className="bg-bg-elevated rounded-xl p-4 mb-4">
            <div className="text-xs text-gray-500 mb-1">Müşteri İddiası</div>
            <p className="text-gray-300">{dispute.description}</p>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-4">
            <div className="bg-status-error/10 border border-status-error/30 rounded-xl px-4 py-2">
              <div className="text-xs text-gray-400">Kilitli Miktar</div>
              <div className="font-mono font-bold text-status-error">{budget} XLM</div>
            </div>
            {!isResolved && (
              <div className="text-xs text-gray-500">
                Para, karar verilene kadar escrow hesabında kilitli kalacak
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Parties */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Taraflar</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: dispute.client_name, email: dispute.client_email, role: 'Müşteri', isOpener: dispute.opened_by_role === 'client', color: 'from-brand-primary to-brand-accent' },
                  { name: dispute.freelancer_name || 'Atanmadı', email: dispute.freelancer_email || '-', role: 'Freelancer', isOpener: false, color: 'from-stellar-cyan to-stellar-blue' },
                ].map((p, i) => (
                  <div key={i} className="bg-bg-elevated rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-bold`}>
                        {p.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.role}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{p.email}</div>
                    {p.isOpener && <div className="mt-2 text-xs text-status-error">İtirazı açan</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Freelancer Response */}
            {dispute.freelancer_response ? (
              <div className="bg-bg-card border border-stellar-cyan/30 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-stellar-cyan uppercase tracking-wide mb-3">👨‍💻 Freelancer Cevabı</h3>
                <p className="text-gray-300">{dispute.freelancer_response}</p>
              </div>
            ) : isFreelancer && !isResolved ? (
              <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Cevabınızı Yazın</h3>
                <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4}
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors resize-none mb-3"
                  placeholder="İtirazı neden reddettiğinizi açıklayın..." />
                <button onClick={handleRespond} disabled={responding}
                  className="bg-stellar-cyan/20 border border-stellar-cyan/40 hover:bg-stellar-cyan/30 text-stellar-cyan px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50">
                  {responding ? 'Gönderiliyor...' : 'Cevap Gönder'}
                </button>
              </div>
            ) : null}

            {/* Job Details */}
            {dispute.job_description && (
              <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">İş Detayları</h3>
                <p className="text-gray-400 text-sm">{dispute.job_description}</p>
                {dispute.delivery_note && (
                  <div className="mt-4 pt-4 border-t border-bg-border">
                    <div className="text-xs text-gray-500 mb-1">Teslim Notu:</div>
                    <p className="text-gray-300 text-sm">{dispute.delivery_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Resolution Result */}
            {isResolved && dispute.resolution && (
              <div className={`rounded-2xl p-5 border ${
                dispute.resolution === 'freelancer' ? 'bg-status-success/10 border-status-success/30' :
                dispute.resolution === 'client' ? 'bg-status-info/10 border-status-info/30' :
                'bg-status-warning/10 border-status-warning/30'
              }`}>
                <div className="text-sm font-semibold text-white mb-2">⚖️ Karar</div>
                <div className="text-lg font-bold">
                  {dispute.resolution === 'freelancer' ? '✅ Freelancer Kazandı' :
                   dispute.resolution === 'client' ? '↩️ Müşteri İadesi' :
                   `⚖️ Kısmi Ödeme (${dispute.partial_percent}%)`}
                </div>
                {dispute.resolved_at && (
                  <div className="text-xs text-gray-400 mt-2">{new Date(dispute.resolved_at).toLocaleString('tr-TR')}</div>
                )}
              </div>
            )}

            {/* Admin Info Panel */}
            {isAdmin && (
              <div className="bg-bg-card border border-brand-accent/30 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-brand-accent uppercase tracking-wide">🔑 Admin Bilgileri</h3>

                {[
                  { label: 'İtiraz Eden Cüzdan', value: dispute.opened_by_role === 'client' ? dispute.client_email : dispute.freelancer_email },
                  { label: 'Karşı Taraf Cüzdan',  value: dispute.opened_by_role === 'client' ? dispute.freelancer_email : dispute.client_email },
                  { label: 'İş Başlığı',          value: dispute.job_title },
                  { label: 'Kilitli Miktar',       value: `${budget} XLM` },
                  { label: 'İtiraz Sebebi',        value: REASON_LABELS[dispute.reason] ?? dispute.reason },
                  { label: 'Zaman Damgası',        value: new Date(dispute.opened_at).toLocaleString('tr-TR') },
                ].map(row => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-xs font-mono text-gray-300 break-all">{row.value ?? '—'}</span>
                  </div>
                ))}

                {dispute.evidence && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500">Kanıt Dosyası</span>
                    <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2">
                      <span>{dispute.evidence.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                      <div>
                        <p className="text-xs text-white font-medium">{dispute.evidence.name}</p>
                        <p className="text-xs text-gray-500">{(dispute.evidence.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  </div>
                )}

                {!isResolved && (
                  <button onClick={() => setShowResolve(true)}
                    className="w-full bg-brand-accent/20 border border-brand-accent/40 hover:bg-brand-accent/30 text-brand-accent py-3 rounded-xl font-medium transition-all mt-2">
                    Karar Ver
                  </button>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Zaman Çizelgesi</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-status-error mt-1.5 shrink-0" />
                  <div>
                    <div className="text-xs text-white">İtiraz Açıldı</div>
                    <div className="text-xs text-gray-500">{new Date(dispute.opened_at).toLocaleString('tr-TR')}</div>
                  </div>
                </div>
                {dispute.freelancer_response && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-stellar-cyan mt-1.5 shrink-0" />
                    <div><div className="text-xs text-white">Freelancer Cevapladı</div></div>
                  </div>
                )}
                {isResolved && dispute.resolved_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-success mt-1.5 shrink-0" />
                    <div>
                      <div className="text-xs text-white">Çözüldü</div>
                      <div className="text-xs text-gray-500">{new Date(dispute.resolved_at).toLocaleString('tr-TR')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal open={showResolve} onClose={() => setShowResolve(false)} title="İtiraz Kararı" size="md">
        <div className="space-y-5">
          <div className="bg-bg-elevated rounded-xl p-4 text-sm text-gray-400">
            Karar: <strong className="text-white">{budget} XLM</strong> nasıl dağıtılacak?
          </div>

          <div className="space-y-2">
            {[
              { val: 'freelancer' as const, label: '✅ Freelancer Kazandı', desc: `${(budget * 0.99).toFixed(2)} XLM freelancer'a gider` },
              { val: 'client' as const, label: '↩️ Müşteri İadesi', desc: `${budget} XLM müşteriye iade edilir` },
              { val: 'partial' as const, label: '⚖️ Kısmi Ödeme', desc: 'Yüzde oranında paylaştırılır' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setResolution(opt.val)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${resolution === opt.val ? 'border-brand-primary bg-brand-primary/10' : 'border-bg-border bg-bg-elevated hover:border-bg-border/60'}`}>
                <div className="text-sm font-semibold text-white">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>

          {resolution === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Freelancer'a Yüzde: %{partialPercent}</label>
              <input type="range" min="10" max="90" step="5" value={partialPercent} onChange={e => setPartialPercent(parseInt(e.target.value))}
                className="w-full" />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Freelancer: {freelancerAmount.toFixed(2)} XLM</span>
                <span>Müşteri: {clientRefund.toFixed(2)} XLM iade</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setShowResolve(false)} className="flex-1 bg-bg-elevated border border-bg-border text-gray-300 py-3 rounded-xl font-medium hover:bg-bg-card transition-all">İptal</button>
            <button onClick={handleResolve} disabled={resolving}
              className="flex-1 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all">
              {resolving ? '⏳...' : 'Kararı Onayla'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
