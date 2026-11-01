import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Admin } from '../types';
import { getAdminMe, adminLogout as logoutService } from '../services/auth';

interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  setAdmin: (admin: Admin | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }
    getAdminMe()
      .then(setAdmin)
      .catch(() => {
        localStorage.removeItem('adminToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch {
      /* ignore */
    } finally {
      setAdmin(null);
      localStorage.removeItem('adminToken');
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, setAdmin, logout, isAuthenticated: !!admin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
};
