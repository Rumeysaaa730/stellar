import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { truncateAddress } from '../stellar/freighter';
import api, { Transaction } from '../api/client';
import toast from 'react-hot-toast';

const TX_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  escrow_fund:     { label: 'Escrow Fonu',     color: 'text-status-warning',  icon: '🔒' },
  release_payment: { label: 'Ödeme Serbest',   color: 'text-status-success',  icon: '✅' },
  refund:          { label: 'İade',             color: 'text-brand-secondary', icon: '↩️' },
  partial_payment: { label: 'Kısmi Ödeme',     color: 'text-stellar-cyan',    icon: '⚡' },
  commission:      { label: 'Komisyon',         color: 'text-gray-400',        icon: '💼' },
};

export default function Profile() {
  const { user } = useAuth();
  const { address, isConnected, xlmBalance, connect, refreshBalance } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/transactions')
      .then(r => setTransactions(r.data))
      .catch(() => toast.error('İşlemler yüklenemedi'))
      .finally(() => setLoading(false));
    if (address) refreshBalance();
  }, []);

  if (!user) return null;

  const roleLabel = user.role === 'client' ? '🧑‍💼 Müşteri' : user.role === 'freelancer' ? '👨‍💻 Freelancer' : '🔑 Admin';

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Card */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-black shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <div className="text-sm text-gray-400 mt-0.5">{roleLabel}</div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>⭐</span>
                  <span className="text-white font-medium">{user.reputation?.toFixed(1)}</span>
                  <span>puan</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>✅</span>
                  <span className="text-white font-medium">{user.completed_jobs}</span>
                  <span>tamamlanan iş</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>📅</span>
                  <span>{new Date(user.created_at).toLocaleDateString('tr-TR')}'den beri üye</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Cüzdan Bilgileri</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-bg-border">
              <span className="text-sm text-gray-400">Kayıtlı Adres</span>
              <span className="font-mono text-xs text-white bg-bg-elevated px-3 py-1.5 rounded-lg">
                {user.wallet_address ? truncateAddress(user.wallet_address, 10) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-bg-border">
              <span className="text-sm text-gray-400">Freighter Durumu</span>
              {isConnected && address ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span className="text-xs text-status-success font-medium">Bağlı</span>
                  <span className="font-mono text-xs text-gray-400">{truncateAddress(address, 6)}</span>
                </div>
              ) : (
                <button onClick={connect}
                  className="text-xs bg-brand-primary/20 border border-brand-primary/50 text-brand-secondary px-3 py-1.5 rounded-lg hover:bg-brand-primary/30 transition-all">
                  Freighter Bağla
                </button>
              )}
            </div>
            {isConnected && (
              <div className="flex items-center justify-between py-3 border-b border-bg-border">
                <span className="text-sm text-gray-400">Cüzdan Bakiyesi</span>
                <span className="text-white font-bold">{xlmBalance.toFixed(4)} <span className="text-brand-secondary text-xs">XLM</span></span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-bg-border">
              <span className="text-sm text-gray-400">{user.role === 'freelancer' ? 'Toplam Kazanç' : 'Toplam Harcama'}</span>
              <span className="text-white font-bold">
                {((user.role === 'freelancer' ? user.total_earned : user.total_spent) ?? 0).toLocaleString()} <span className="text-brand-secondary text-xs">XLM</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">Platform Bakiyesi</span>
              <span className="text-white font-bold">{(user as any).balance_xlm?.toLocaleString() ?? 0} <span className="text-brand-secondary text-xs">XLM</span></span>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">İşlem Geçmişi</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-bg-elevated rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm">Henüz işlem yok</div>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'text-gray-400', icon: '📄' };
                const isIncoming = tx.to_address === user.wallet_address;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-bg-elevated rounded-xl hover:bg-bg-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-bg-card flex items-center justify-center text-base shrink-0">
                        {meta.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {tx.job_title || meta.label}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${isIncoming ? 'text-status-success' : 'text-status-error'}`}>
                        {isIncoming ? '+' : '-'}{tx.amount_xlm.toLocaleString()} XLM
                      </div>
                      <div className={`text-xs mt-0.5 ${tx.status === 'completed' ? 'text-status-success' : 'text-status-warning'}`}>
                        {tx.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
