import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Job } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';

export default function JobCard({ job, showActions = false }: { job: Job; showActions?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const commission = job.budget_xlm * 0.01;
  const net = job.budget_xlm - commission;

  return (
    <Link to={`/jobs/${job.id}`}
      className="block bg-bg-card border border-bg-border rounded-xl p-5 hover:border-brand-primary/50 hover:shadow-glow-sm transition-all group animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-white group-hover:text-brand-secondary transition-colors line-clamp-1">{job.title}</h3>
        <StatusBadge status={job.status} />
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-4">{job.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-bg-elevated rounded-lg px-3 py-1.5">
            <div className="text-xs text-gray-500">Bütçe</div>
            <div className="font-mono text-sm font-bold text-brand-secondary">{job.budget_xlm} XLM</div>
          </div>
          {job.escrow_funded ? (
            <div className="flex items-center gap-1 text-xs text-status-success">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
              Escrow'da
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              Bekleniyor
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">{job.category}</div>
          {job.freelancer_name ? (
            <div className="text-xs text-gray-400 mt-0.5">👤 {job.freelancer_name}</div>
          ) : job.has_applied ? (
            <div className="text-xs text-brand-accent mt-0.5">✓ Başvurdunuz</div>
          ) : (user?.role === 'client' && (job.applicant_count ?? 0) > 0) ? (
            <div className="text-xs text-status-warning mt-0.5">🙋 {job.applicant_count} başvuru</div>
          ) : null}
        </div>
      </div>

      {job.deadline && (
        <div className="mt-3 pt-3 border-t border-bg-border flex items-center gap-1 text-xs text-gray-500">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
          Son: {new Date(job.deadline).toLocaleDateString('tr-TR')}
        </div>
      )}
    </Link>
  );
}
