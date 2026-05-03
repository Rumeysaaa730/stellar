import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * /dashboard — redirects to the role-specific dashboard.
 * This is kept as a convenience redirect so existing links don't break.
 */
export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          Yükleniyor...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'client') return <Navigate to="/dashboard/client" replace />;
  if (user.role === 'freelancer') return <Navigate to="/dashboard/freelancer" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}
