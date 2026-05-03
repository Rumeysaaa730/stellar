import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useNotifications, Notification } from '../hooks/useNotifications';

const TYPE_ICONS: Record<string, string> = {
  job_accepted:      '🔔',
  job_applied:       '🙋',
  job_rejected:      '❌',
  job_submitted:     '📦',
  dispute_opened:    '⚠️',
  dispute_resolved:  '⚖️',
  payment_released:  '💸',
  new_escrow:        '🔔',
};

const TYPE_TITLES: Record<string, string> = {
  job_accepted:     'Yeni Escrow',
  job_applied:      'Yeni Başvuru',
  job_rejected:     'Başvuru Sonucu',
  job_submitted:    'İş Teslim Edildi',
  dispute_opened:   'İtiraz Açıldı',
  dispute_resolved: 'İtiraz Çözüldü',
  payment_released: 'Ödeme Alındı',
  new_escrow:       'Yeni Escrow',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}sa önce`;
  return `${Math.floor(hours / 24)}g önce`;
}

// Custom toast popup component
function NotificationToast({
  n, toastId, onView,
}: { n: Notification; toastId: string; onView: () => void }) {
  return (
    <div className="bg-bg-elevated border border-bg-border rounded-2xl shadow-2xl w-80 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <span className="text-base">{TYPE_ICONS[n.type] || '🔔'}</span>
          <span className="text-sm font-semibold text-text-primary">
            {TYPE_TITLES[n.type] || 'Yeni bildirim'}
          </span>
        </div>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="text-text-muted hover:text-text-primary text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>
      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{n.message}</p>
        {n.link && (
          <div className="flex justify-end mt-2">
            <button
              onClick={onView}
              className="text-xs text-brand-primary font-semibold hover:underline transition-colors"
            >
              Görüntüle →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationDropdown() {
  const { notifications, newNotifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Show toast popup for each new notification
  useEffect(() => {
    if (newNotifications.length === 0) return;
    newNotifications.forEach(n => {
      const toastId = `notif-${n.id}`;
      toast.custom(
        t => (
          <NotificationToast
            n={n}
            toastId={t.id}
            onView={() => {
              toast.dismiss(t.id);
              if (n.link) navigate(n.link);
            }}
          />
        ),
        { id: toastId, duration: 5000, position: 'top-right' },
      );
    });
  }, [newNotifications, navigate]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-lg bg-bg-elevated hover:bg-bg-card border border-bg-border transition-all"
        aria-label="Bildirimler"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-secondary fill-current">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-error text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-elevated border border-bg-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
            <h4 className="font-heading font-semibold text-text-primary text-sm">
              Bildirimler
              {unreadCount > 0 && (
                <span className="ml-2 bg-brand-primary/20 text-brand-primary text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount} yeni
                </span>
              )}
            </h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-primary hover:underline">
                Tümünü okundu say
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-bg-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                <div className="text-2xl mb-2">🔔</div>
                Henüz bildirim yok
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={[
                    'w-full text-left px-4 py-3 transition-colors hover:bg-bg-card flex items-start gap-3',
                    n.read ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${n.read ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
