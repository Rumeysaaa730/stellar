import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { checkFreighterInstalled, connectFreighter } from '../stellar/freighter';
import api from '../api/client';

function getDashboardPath(role: string): string {
  if (role === 'client') return '/dashboard/client';
  if (role === 'freelancer') return '/dashboard/freelancer';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

export default function Login() {
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim()) { toast.error('Ad soyad giriniz'); return; }
    setLoading(true);
    try {
      const installed = await checkFreighterInstalled();
      if (!installed) {
        toast.error('Freighter yüklü değil. freighter.app adresinden indirin.');
        setLoading(false);
        return;
      }

      const address = await connectFreighter();
      if (!address) {
        toast.error('Cüzdan bağlanamadı');
        setLoading(false);
        return;
      }

      // Login with both name and wallet — backend verifies they match
      await login(name.trim(), address);
      updateUser({ wallet_address: address });
      toast.success('Hoş geldiniz!');
      const me = await api.get('/auth/me');
      navigate(getDashboardPath(me.data.role));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr.response?.status === 404) {
        toast.error('Bu isimle kayıtlı hesap bulunamadı. Kayıt olmak ister misiniz?');
      } else if (axiosErr.response?.status === 401) {
        toast.error('Bu cüzdan bu hesaba ait değil. Kendi Freighter cüzdanınızı kullanın.');
      } else {
        toast.error(axiosErr.response?.data?.error || 'Giriş başarısız');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo login — only for demo accounts without wallet (bypasses wallet check)
  const demoLogin = async (type: 'client' | 'freelancer' | 'admin') => {
    const names = {
      client:     'Ahmet Yılmaz',
      freelancer: 'Zeynep Kaya',
      admin:      'Platform Admin',
    };
    setLoading(true);
    try {
      await login(names[type]);
      toast.success('Demo girişi yapıldı');
      navigate(getDashboardPath(type));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Demo giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-glow-sm">
              <span className="text-white text-lg">⛓</span>
            </div>
            <span className="font-heading text-xl font-bold text-text-primary">FreelanceChain</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold text-text-primary mt-6 mb-1">Giriş Yap</h1>
          <p className="text-text-secondary text-sm">Ad soyadınız + Freighter cüzdanınızla giriş yapın</p>
        </div>

        <div className="bg-bg-card border border-bg-border rounded-2xl p-8 space-y-5">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="off"
              className="input-field"
              placeholder="Kayıtlı adınız soyadınız"
            />
          </div>

          {/* Security info */}
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl px-4 py-3 text-xs text-text-muted space-y-1">
            <div className="flex items-center gap-2">
              <span>🔐</span>
              <span>Freighter cüzdanınız kimlik doğrulama için kullanılır</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>Kayıtlı cüzdanınızla eşleşmeden giriş yapılamaz</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 text-white py-3.5 rounded-xl font-heading font-semibold text-base transition-all shadow-glow-sm"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Bağlanıyor...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="white" fillOpacity="0.2"/>
                  <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="white"/>
                </svg>
                Freighter ile Giriş Yap
              </>
            )}
          </button>
          <p className="text-xs text-text-muted text-center">
            Freighter yüklü değil mi?{' '}
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer"
              className="text-brand-primary hover:underline">
              freighter.app
            </a>
          </p>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Hesabınız yok mu?{' '}
          <Link to="/register" className="text-brand-primary hover:underline font-medium">Kayıt Ol</Link>
        </p>

        {/* Demo section — test only */}
        <div className="mt-6 border border-bg-border rounded-2xl p-4">
          <p className="text-xs text-text-muted text-center mb-3">
            🧪 <span className="font-medium">Sadece test amaçlı demo girişi</span> — gerçek hesap değildir
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['client', 'freelancer', 'admin'] as const).map(type => (
              <button key={type} onClick={() => demoLogin(type)} disabled={loading}
                className="text-xs bg-bg-elevated hover:bg-bg-border border border-bg-border rounded-lg py-2 text-text-muted hover:text-text-secondary transition-all disabled:opacity-50">
                {type === 'client' ? '🧑‍💼 Müşteri' : type === 'freelancer' ? '👨‍💻 Freelancer' : '🔑 Admin'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
