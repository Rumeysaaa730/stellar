import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { checkFreighterInstalled, connectFreighter, truncateAddress } from '../stellar/freighter';

function getDashboardPath(role: string): string {
  if (role === 'client') return '/dashboard/client';
  if (role === 'freelancer') return '/dashboard/freelancer';
  return '/dashboard';
}

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'freelancer' | ''>('');
  const [walletAddress, setWalletAddress] = useState('');
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    try {
      const installed = await checkFreighterInstalled();
      if (!installed) {
        toast.error('Freighter yüklü değil. freighter.app adresinden indirin.');
        return;
      }
      const address = await connectFreighter();
      if (!address) { toast.error('Cüzdan bağlanamadı'); return; }
      setWalletAddress(address);
      toast.success('Cüzdan bağlandı!');
    } catch {
      toast.error('Cüzdan bağlantısı başarısız');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) { toast.error('Ad soyad giriniz'); return; }
    if (!role) { toast.error('Rol seçin'); return; }
    if (!walletAddress) { toast.error('Önce Freighter cüzdanınızı bağlayın'); return; }
    setLoading(true);
    try {
      await register(name.trim(), walletAddress, role);
      toast.success('Hesap oluşturuldu! Hoş geldiniz!');
      navigate(getDashboardPath(role));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
              <span className="text-white text-lg">⛓</span>
            </div>
            <span className="font-heading text-xl font-bold text-text-primary">FreelanceChain</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold text-text-primary mt-6 mb-1">{t('auth.register')}</h1>
          <p className="text-text-secondary text-sm">Freighter cüzdanınızla hesap oluşturun</p>
        </div>

        <div className="bg-bg-card border border-bg-border rounded-2xl p-8 space-y-5">
          {/* Step 1 — Role */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              <span className="bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">1</span>
              Rolünüzü seçin
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['client', 'freelancer'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    role === r
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-bg-border bg-bg-elevated hover:border-brand-primary/40'
                  }`}>
                  <div className="text-2xl mb-2">{r === 'client' ? '🧑‍💼' : '👨‍💻'}</div>
                  <div className="text-sm font-semibold text-text-primary mb-1">{t(`auth.${r}`)}</div>
                  <div className="text-xs text-text-muted">{t(`auth.${r}_desc`)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              <span className="bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">2</span>
              Ad Soyad
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="input-field"
              placeholder="Adınız Soyadınız"
              autoComplete="off"
            />
          </div>

          {/* Step 3 — Freighter wallet */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              <span className="bg-brand-primary text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">3</span>
              Freighter Cüzdan
            </label>
            {walletAddress ? (
              <div className="flex items-center justify-between bg-status-success/10 border border-status-success/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span className="font-mono text-sm text-status-success">{truncateAddress(walletAddress, 8)}</span>
                </div>
                <button
                  onClick={() => setWalletAddress('')}
                  className="text-xs text-text-muted hover:text-status-error transition-colors"
                >
                  Değiştir
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={connectingWallet}
                className="w-full flex items-center justify-center gap-2 bg-bg-elevated border border-bg-border hover:border-brand-primary/50 text-text-secondary hover:text-text-primary py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {connectingWallet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-text-muted border-t-brand-primary rounded-full animate-spin" />
                    Bağlanıyor...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                    </svg>
                    Freighter Bağla
                  </>
                )}
              </button>
            )}
          </div>

          {/* Security note */}
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl px-4 py-3 text-xs text-text-muted">
            🔐 Cüzdan adresiniz hesabınıza bağlanır. Giriş yaparken aynı cüzdanı kullanmanız gerekir.
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || !name.trim() || !role || !walletAddress}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-40 text-white py-3 rounded-xl font-heading font-semibold transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Oluşturuluyor...
              </span>
            ) : 'Hesap Oluştur'}
          </button>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          {t('auth.have_account')}{' '}
          <Link to="/login" className="text-brand-primary hover:underline font-medium">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
