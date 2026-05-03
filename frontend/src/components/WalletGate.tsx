import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';

interface WalletGateProps {
  children: React.ReactNode;
  /** If set, user's role must match */
  requiredRole?: 'client' | 'freelancer' | 'admin';
  /** If set, user's id must match this owner id */
  ownerId?: string;
  /** Custom "no permission" message */
  permissionMessage?: string;
}

export default function WalletGate({ children, requiredRole, ownerId, permissionMessage }: WalletGateProps) {
  const { isConnected, sessionExpired, connect } = useWallet();
  const { user } = useAuth();

  // Session expired
  if (sessionExpired) {
    return (
      <div className="w-full flex flex-col items-center gap-3 bg-status-warning/10 border border-status-warning/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-status-warning text-sm font-medium">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          Oturum süresi doldu
        </div>
        <button
          onClick={connect}
          className="flex items-center gap-2 bg-status-warning/20 border border-status-warning/40 hover:bg-status-warning/30 text-status-warning px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
          </svg>
          Tekrar Bağlan
        </button>
      </div>
    );
  }

  // Wallet not connected
  if (!isConnected) {
    return (
      <div className="w-full flex flex-col items-center gap-3 bg-bg-elevated border border-bg-border rounded-xl p-4">
        <div className="text-sm text-text-muted">İşlem yapmak için cüzdanınızı bağlayın</div>
        <button
          onClick={connect}
          className="flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/50 hover:bg-brand-primary/30 text-brand-secondary px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
          </svg>
          Cüzdan Bağla
        </button>
      </div>
    );
  }

  // Role check
  if (requiredRole && user?.role !== requiredRole) {
    const roleLabel = requiredRole === 'client' ? 'müşteri' : requiredRole === 'freelancer' ? 'freelancer' : 'admin';
    return (
      <div className="w-full flex items-center gap-2 bg-status-error/10 border border-status-error/30 rounded-xl px-4 py-3 text-status-error text-sm">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L17 9l-6 6z"/>
        </svg>
        Bu işlem için {roleLabel} yetkisi gerekli
      </div>
    );
  }

  // Ownership check
  if (ownerId && user?.id !== ownerId) {
    return (
      <div className="w-full flex items-center gap-2 bg-status-error/10 border border-status-error/30 rounded-xl px-4 py-3 text-status-error text-sm">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        {permissionMessage || 'Bu işlem için yetkiniz yok'}
      </div>
    );
  }

  return <>{children}</>;
}
