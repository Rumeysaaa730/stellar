import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import './i18n';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WalletAlert from './components/WalletAlert';
import StarBurst from './components/StarBurst';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import FreelancerDashboard from './pages/dashboard/FreelancerDashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Disputes from './pages/Disputes';
import DisputeDetail from './pages/DisputeDetail';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import HowItWorks from './pages/HowItWorks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <WalletAlert />
      <div className="flex flex-col min-h-screen">
        <Routes>
          {/* Public */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

          {/* Dashboard — redirect to role-specific */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Role-specific dashboards */}
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/freelancer"
            element={
              <ProtectedRoute allowedRoles={['freelancer']}>
                <FreelancerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Jobs */}
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />

          {/* Disputes */}
          <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
          <Route path="/disputes/:id" element={<ProtectedRoute><DisputeDetail /></ProtectedRoute>} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-bg-primary font-sans">
            <StarBurst />
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A2742',
                  color: '#F8FAFC',
                  border: '1px solid #2D3F57',
                  borderRadius: 12,
                  fontSize: 14,
                },
                success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
              }}
            />
          </div>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}
