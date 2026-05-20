import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VerifyMFAPage from './pages/VerifyMFAPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProfilePage from './pages/ProfilePage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import VaultPage from './pages/VaultPage';
import { getCurrentUser } from './services/authService';

import Layout from './components/Layout';

// Protected Route Component
const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
};

import { Toaster } from 'sonner';

const App: React.FC = () => {
  return (
    <>
      <Toaster position="top-right" theme="dark" richColors closeButton />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-mfa" element={<VerifyMFAPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute><VaultPage /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
