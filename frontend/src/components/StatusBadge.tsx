import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES: Record<string, string> = {
  // Legacy lowercase
  open: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30',
  in_progress: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  delivered: 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30',
  completed: 'bg-status-success/20 text-status-success border-status-success/30',
  disputed: 'bg-status-error/20 text-status-error border-status-error/30',
  cancelled: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  refunded: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  resolved: 'bg-status-success/20 text-status-success border-status-success/30',
  pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  failed: 'bg-status-error/20 text-status-error border-status-error/30',
  // New UPPERCASE statuses
  CREATED: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  FUNDED: 'bg-brand-primary/20 text-brand-primary border-brand-primary/30',
  IN_PROGRESS: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  SUBMITTED: 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30',
  APPROVED: 'bg-status-success/20 text-status-success border-status-success/30',
  COMPLETED: 'bg-status-success/20 text-status-success border-status-success/30',
  DISPUTED: 'bg-status-error/20 text-status-error border-status-error/30',
  CANCELLED: 'bg-text-muted/20 text-text-muted border-text-muted/30',
  OPEN: 'bg-status-error/20 text-status-error border-status-error/30',
  REVIEWING: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  RESOLVED: 'bg-status-success/20 text-status-success border-status-success/30',
  REFUNDED: 'bg-text-muted/20 text-text-muted border-text-muted/30',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık', in_progress: 'Devam Ediyor', delivered: 'Teslim Edildi',
  completed: 'Tamamlandı', disputed: 'İtirazda', cancelled: 'İptal',
  refunded: 'İade Edildi', resolved: 'Çözüldü', pending: 'Bekliyor',
  failed: 'Başarısız',
  CREATED: 'Oluşturuldu', FUNDED: 'Finanslandı', IN_PROGRESS: 'Devam Ediyor',
  SUBMITTED: 'Teslim Edildi', APPROVED: 'Onaylandı', COMPLETED: 'Tamamlandı',
  DISPUTED: 'İtirazda', CANCELLED: 'İptal', OPEN: 'Açık',
  REVIEWING: 'İnceleniyor', RESOLVED: 'Çözüldü', REFUNDED: 'İade Edildi',
};

export default function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status] || 'bg-text-muted/20 text-text-muted border-text-muted/30';
  const label =
    STATUS_LABELS[status] ||
    t(`job.status_labels.${status.toLowerCase()}`, { defaultValue: status });
  const sizeClass = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-medium ${style} ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
