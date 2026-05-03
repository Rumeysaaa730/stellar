import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { truncateAddress } from '../stellar/freighter';
import NotificationDropdown from './NotificationDropdown';

const LANGS = [{ code: 'tr', label: 'TR', flag: '🇹🇷' }, { code: 'en', label: 'EN', flag: '🇬🇧' }];

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { address, isConnected, xlmBalance, connect, sessionExpired, minutesLeft } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  const dashboardPath =
    user?.role === 'client' ? '/dashboard/client' :
    user?.role === 'freelancer' ? '/dashboard/freelancer' :
    '/dashboard';

  interface NavLink {
    to: string;
    label: string;
    highlight?: boolean;
  }

  const navLinks: NavLink[] = user
    ? user.role === 'client'
      ? [
          { to: '/dashboard/client?create=1', label: '+ Escrow Oluştur', highlight: true },
          { to: '/jobs', label: 'İşlerim' },
          { to: '/profile', label: 'Profil' },
        ]
      : user.role === 'freelancer'
      ? [
          { to: '/jobs?filter=available', label: 'Teklifler' },
          { to: '/jobs?filter=mine', label: 'İşlerim' },
          { to: '/profile', label: 'Kazancım' },
        ]
      : user.role === 'admin'
      ? [
          { to: '/admin', label: 'Admin Panel' },
          { to: '/admin?tab=jobs', label: 'Tüm İşler' },
          { to: '/admin?tab=users', label: 'Kullanıcılar' },
        ]
      : []
    : [
        { to: '/', label: 'Ana Sayfa' },
        { to: '/how-it-works', label: 'Nasıl Çalışır?' },
      ];

  const isActive = (to: string) => {
    try {
      return location.pathname === new URL(to, 'http://x').pathname;
    } catch {
      return location.pathname === to;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-bg-border bg-bg-secondary/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg">FreelanceChain</span>
            <span className="hidden sm:block text-xs text-brand-secondary bg-brand-primary/10 px-1.5 py-0.5 rounded font-mono">TESTNET</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={
                  l.highlight
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white px-3 py-1 rounded-lg text-sm font-semibold'
                    : `text-sm font-medium transition-colors ${
                        isActive(l.to) ? 'text-brand-secondary' : 'text-text-secondary hover:text-text-primary'
                      }`
                }>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Language */}
            <div className="flex items-center gap-1 bg-bg-elevated rounded-lg p-1">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)}
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    i18n.language === l.code ? 'bg-brand-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>

            {/* Wallet (only when logged in) */}
            {user && (() => {
              if (sessionExpired) {
                return (
                  <button onClick={connect}
                    className="hidden sm:flex items-center gap-2 bg-status-warning/20 border border-status-warning/50 hover:bg-status-warning/30 text-status-warning rounded-lg px-3 py-1.5 text-xs font-medium transition-all animate-pulse">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Tekrar Bağlan
                  </button>
                );
              }
              if (isConnected && address) {
                const isWarnZone = minutesLeft !== null && minutesLeft <= 10;
                return (
                  <div className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border ${
                    isWarnZone
                      ? 'bg-status-warning/10 border-status-warning/40'
                      : 'bg-bg-elevated border-status-success/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isWarnZone ? 'bg-status-warning' : 'bg-status-success'}`} />
                    <span className="text-xs text-text-secondary font-mono">{truncateAddress(address)}</span>
                    <span className={`text-xs font-medium ${isWarnZone ? 'text-status-warning' : 'text-status-success'}`}>
                      {xlmBalance.toFixed(0)} XLM
                    </span>
                    {isWarnZone && minutesLeft !== null && (
                      <span className="text-xs text-status-warning font-mono">
                        {minutesLeft}dk
                      </span>
                    )}
                  </div>
                );
              }
              return (
                <button onClick={connect}
                  className="hidden sm:flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/50 hover:bg-brand-primary/30 text-brand-secondary rounded-lg px-3 py-1.5 text-xs font-medium transition-all">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                  </svg>
                  Cüzdan Bağla
                </button>
              );
            })()}

            {/* Notifications */}
            {user && <NotificationDropdown />}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-bg-elevated hover:bg-bg-card rounded-lg px-3 py-1.5 transition-all">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-medium text-text-primary">{user.name}</div>
                    <div className="text-xs text-text-secondary capitalize">{user.role}</div>
                  </div>
                  <svg viewBox="0 0 20 20"
                    className={`w-4 h-4 text-text-secondary transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-bg-elevated border border-bg-border rounded-xl shadow-card overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-bg-border">
                      <div className="text-xs text-text-muted">Giriş yapıldı</div>
                      <div className="text-sm font-medium text-text-primary truncate">
                        {user.wallet_address ? `${user.wallet_address.slice(0, 8)}...` : user.name}
                      </div>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-border transition-colors flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                      Profilim
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-status-error hover:bg-status-error/10 transition-colors flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                      </svg>
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="text-sm bg-brand-primary hover:bg-brand-primary/80 text-white px-4 py-1.5 rounded-lg transition-all font-medium">
                {t('auth.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
