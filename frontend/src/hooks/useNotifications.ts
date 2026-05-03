import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

const POLL_INTERVAL = 15_000; // 15 seconds — fast enough for near-realtime feel

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // null = not yet loaded; Set = seen IDs from previous fetches
  const seenIdsRef = useRef<Set<string> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get<Notification[]>('/notifications');

      if (seenIdsRef.current === null) {
        // First fetch — mark all existing as seen, no pop-ups on login
        seenIdsRef.current = new Set(data.map(n => n.id));
        setNewNotifications([]);
      } else {
        const freshOnes = data.filter(n => !seenIdsRef.current!.has(n.id));
        freshOnes.forEach(n => seenIdsRef.current!.add(n.id));
        if (freshOnes.length > 0) setNewNotifications(freshOnes);
        else setNewNotifications([]);
      }

      setNotifications(data);
    } catch {
      // Non-critical — swallow silently
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNewNotifications([]);
      seenIdsRef.current = null;
      return;
    }
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, newNotifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
