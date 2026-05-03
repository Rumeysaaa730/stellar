import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

export default function WalletAlert() {
  const { user } = useAuth();
  const { isConnected, sessionExpired, connect } = useWallet();

  if (!user) return null;
  if (isConnected && !sessionExpired) return null;

  if (sessionExpired) {
    return (
      <div className="fixed top-16 inset-x-0 z-40 flex items-center justify-center gap-3 bg-status-error/90 backdrop-blur-sm text-white text-xs font-semibold py-2 px-4 shadow-lg">
        <span>🔄</span>
        <span>Oturum süreniz doldu, tekrar bağlanın!</span>
        <button
          onClick={connect}
          className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg ml-1"
        >
          Yeniden Bağlan →
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 inset-x-0 z-40 flex items-center justify-center gap-3 bg-status-warning/90 backdrop-blur-sm text-white text-xs font-semibold py-2 px-4 shadow-lg">
      <span>⚠️</span>
      <span>Lütfen önce cüzdanınızı bağlayın!</span>
      <button
        onClick={connect}
        className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg ml-1"
      >
        Cüzdan Bağla →
      </button>
    </div>
  );
}
