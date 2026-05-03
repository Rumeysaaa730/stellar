import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { checkFreighterInstalled, connectFreighter, fundWithFriendbot } from '../stellar/freighter';
import api from '../api/client';
import { useAuth } from './AuthContext';

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
const WARN_BEFORE_MS = 10 * 60 * 1000;       // warn 10 min before expiry

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isInstalled: boolean;
  xlmBalance: number;
  sessionExpired: boolean;
  minutesLeft: number | null;    // null = not connected; 0 = expired
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  fundFriendbot: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>(null!);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [address, setAddress] = useState<string | null>(user?.wallet_address || null);
  const [isConnected, setIsConnected] = useState(!!user?.wallet_address);
  const [isInstalled, setIsInstalled] = useState(false);
  const [xlmBalance, setXlmBalance] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
      if (res.ok) {
        const data = await res.json();
        const native = data.balances?.find((b: any) => b.asset_type === 'native');
        setXlmBalance(native ? parseFloat(native.balance) : 0);
      }
    } catch {
      setXlmBalance(0);
    }
  }, [address]);

  // Start 1-hour countdown when a session expiry time is set
  useEffect(() => {
    if (!sessionExpiresAt) return;
    clearTimer();

    const tick = () => {
      const diff = sessionExpiresAt - Date.now();
      if (diff <= 0) {
        // Session expired
        setAddress(null);
        setIsConnected(false);
        setXlmBalance(0);
        setSessionExpired(true);
        setMinutesLeft(0);
        clearTimer();
        toast.error('🔄 Oturum süreniz doldu, tekrar bağlanın!', { duration: 6000, id: 'session-expired' });
      } else {
        const mins = Math.ceil(diff / 60_000);
        setMinutesLeft(mins);
        // Warn once when 10 minutes remain
        if (diff <= WARN_BEFORE_MS && diff > WARN_BEFORE_MS - 30_000) {
          toast('⏰ Cüzdan oturumunuz 10 dakika içinde sona eriyor.', { duration: 5000, id: 'session-warn' });
        }
      }
    };

    tick(); // immediate first tick
    timerRef.current = setInterval(tick, 30_000);
    return clearTimer;
  }, [sessionExpiresAt]);

  // Sync wallet address when user changes (login/logout)
  useEffect(() => {
    if (user?.wallet_address) {
      setAddress(user.wallet_address);
      setIsConnected(true);
    } else {
      setAddress(null);
      setIsConnected(false);
      setXlmBalance(0);
      setSessionExpiresAt(null);
      setMinutesLeft(null);
      clearTimer();
    }
  }, [user?.wallet_address]);

  useEffect(() => {
    if (address) refreshBalance();
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    const installed = await checkFreighterInstalled();
    setIsInstalled(installed);
    if (!installed) {
      toast.error('Freighter yüklü değil. Lütfen Chrome eklentisini yükleyin.');
      return;
    }
    const addr = await connectFreighter();
    if (!addr) { toast.error('Cüzdan bağlanamadı'); return; }

    setAddress(addr);
    setIsConnected(true);
    setSessionExpired(false);
    const expiry = Date.now() + SESSION_DURATION_MS;
    setSessionExpiresAt(expiry);

    await api.put('/auth/wallet', { wallet_address: addr });
    updateUser({ wallet_address: addr });
    toast.success('Freighter cüzdanı bağlandı! Oturum 1 saat geçerli.');
    await refreshBalance();
  }, [refreshBalance, updateUser]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setXlmBalance(0);
    setSessionExpiresAt(null);
    setMinutesLeft(null);
    setSessionExpired(false);
    clearTimer();
    toast.success('Cüzdan bağlantısı kesildi');
  }, []);

  const fundFriendbot = useCallback(async () => {
    if (!address) { toast.error('Önce cüzdan bağlayın'); return; }
    const toastId = toast.loading('Friendbot ile finanse ediliyor...');
    const ok = await fundWithFriendbot(address);
    toast.dismiss(toastId);
    if (ok) {
      toast.success('10,000 XLM test bakiyesi yüklendi!');
      await refreshBalance();
    } else {
      toast.error('Friendbot hatası - hesap zaten finanse edilmiş olabilir');
    }
  }, [address, refreshBalance]);

  return (
    <WalletContext.Provider value={{
      address, isConnected, isInstalled, xlmBalance,
      sessionExpired, minutesLeft,
      connect, disconnect, refreshBalance, fundFriendbot,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
