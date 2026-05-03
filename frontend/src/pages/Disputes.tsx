import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { Dispute } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Disputes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/disputes').then(r => setDisputes(r.data)).catch(() => toast.error('Yüklenemedi')).finally(() => setLoading(false));
  }, []);

  const REASON_LABELS: Record<string, string> = {
    not_delivered: 'Teslim edilmedi',
    poor_quality: 'Kalitesiz iş',
    incomplete: 'Eksik teslim',
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">İtirazlar</h1>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-bg-card rounded-xl animate-pulse" />)}</div>
        ) : disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map(d => (
              <Link key={d.id} to={`/disputes/${d.id}`}
                className="block bg-bg-card border border-bg-border hover:border-brand-primary/40 rounded-2xl p-5 transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-white font-semibold">{d.job_title}</div>
                    <div className="text-sm text-gray-400 mt-0.5">{REASON_LABELS[d.reason] || d.reason}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {d.resolution && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        d.resolution === 'freelancer' ? 'text-status-success border-status-success/30 bg-status-success/10' :
                        d.resolution === 'client' ? 'text-status-info border-status-info/30 bg-status-info/10' :
                        'text-status-warning border-status-warning/30 bg-status-warning/10'
                      }`}>
                        {d.resolution === 'freelancer' ? '✅ Freelancer' : d.resolution === 'client' ? '↩️ Müşteri' : '⚖️ Kısmi'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>💰 {d.budget_xlm} XLM kilitli</span>
                  <span>📅 {new Date(d.opened_at).toLocaleDateString('tr-TR')}</span>
                  {d.client_name && <span>🧑‍💼 {d.client_name}</span>}
                  {d.freelancer_name && <span>👨‍💻 {d.freelancer_name}</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <div className="text-gray-400">Henüz itiraz yok</div>
          </div>
        )}
      </div>
    </div>
  );
}
