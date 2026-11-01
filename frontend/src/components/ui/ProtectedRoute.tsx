import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface Props {
  children: React.ReactNode;
  type?: 'citizen' | 'admin';
}

export const ProtectedRoute: React.FC<Props> = ({ children, type = 'citizen' }) => {
  const citizenAuth = useAuth();
  const adminAuth = useAdminAuth();

  if (type === 'admin') {
    if (adminAuth.loading) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-10 h-10" />
      </div>
    );
    if (!adminAuth.isAuthenticated) return <Navigate to="/admin/login" replace />;
    return <>{children}</>;
  }

  if (citizenAuth.loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner w-10 h-10" />
    </div>
  );
  if (!citizenAuth.isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
