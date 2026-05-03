import React from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../api/client';
import { truncateAddress } from '../stellar/freighter';

const STATUS_EMOJI: Record<string, string> = {
  CREATED: '⏳', open: '⏳',
  FUNDED: '🔵',
  IN_PROGRESS: '🔵', in_progress: '🔵',
  SUBMITTED: '🟡', delivered: '🟡',
  COMPLETED: '✅', completed: '✅',
  DISPUTED: '🔴', disputed: '🔴',
  CANCELLED: '⛔',
};

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Oluşturuldu', open: 'Açık',
  FUNDED: 'Fonlandı',
  IN_PROGRESS: 'Devam Ediyor', in_progress: 'Devam Ediyor',
  SUBMITTED: 'Teslim Edildi', delivered: 'Teslim Edildi',
  COMPLETED: 'Tamamlandı', completed: 'Tamamlandı',
  DISPUTED: 'İhtilaflı', disputed: 'İhtilaflı',
  CANCELLED: 'İptal',
};

interface Props {
  job: Job;
  viewerRole?: 'client' | 'freelancer' | 'admin';
}

export default function EscrowCard({ job, viewerRole }: Props) {
  const partyLine =
    viewerRole === 'client'
      ? job.freelancer_wallet
        ? `Freelancer: ${truncateAddress(job.freelancer_wallet, 6)}`
        : job.intended_freelancer_wallet
          ? `Hedef: ${truncateAddress(job.intended_freelancer_wallet, 6)}`
          : 'Freelancer bekleniyor'
      : `İşveren: ${job.client_name ?? '—'}`;

  const emoji = STATUS_EMOJI[job.status] ?? 'ℹ️';
  const label = STATUS_LABEL[job.status] ?? job.status;

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-4 hover:border-brand-primary/40 transition-all flex flex-col gap-3">
      {/* Title */}
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center flex-shrink-0 text-sm">
          📋
        </div>
        <h3 className="font-semibold text-text-primary text-sm leading-snug line-clamp-2 flex-1">
          {job.title}
        </h3>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-text-muted font-mono truncate">
          <span>👤</span>
          <span className="truncate">{partyLine}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>💰</span>
          <span className="text-text-secondary">Miktar:</span>
          <span className="font-mono font-bold text-brand-secondary">{job.budget_xlm} XLM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{emoji}</span>
          <span className="text-text-secondary">Durum:</span>
          <span className="font-medium text-text-primary">{label}</span>
        </div>
      </div>

      {/* Detay button */}
      <Link
        to={`/jobs/${job.id}`}
        className="mt-auto w-full flex items-center justify-center gap-1.5 bg-bg-elevated border border-bg-border hover:border-brand-primary/50 hover:text-brand-secondary text-text-secondary text-xs font-semibold py-2.5 rounded-lg transition-all"
      >
        Detay →
      </Link>
    </div>
  );
}
