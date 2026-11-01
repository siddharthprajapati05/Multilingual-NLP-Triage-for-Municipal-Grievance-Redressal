import api from './api';
import { User, Admin } from '../types';

// ─── Citizen Auth ─────────────────────────────────────────────────────────────
export const register = async (data: {
  fullName: string;
  email?: string;
  mobile?: string;
  password: string;
  preferredLang?: string;
}): Promise<{ user: User; token: string }> => {
  const res = await api.post('/auth/register', data);
  if (res.data.token) localStorage.setItem('token', res.data.token);
  return res.data;
};

export const login = async (identifier: string, password: string): Promise<{ user: User; token: string }> => {
  const res = await api.post('/auth/login', { identifier, password });
  if (res.data.token) localStorage.setItem('token', res.data.token);
  return res.data;
};

export const logout = async () => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

export const getMe = async (): Promise<User> => {
  const res = await api.get('/auth/me');
  return res.data.user;
};

export const updateProfile = async (data: { fullName?: string; preferredLang?: string }): Promise<User> => {
  const res = await api.put('/auth/profile', data);
  return res.data.user;
};

// ─── Admin Auth ───────────────────────────────────────────────────────────────
export const adminLogin = async (adminId: string, password: string): Promise<{ admin: Admin; token: string }> => {
  const res = await api.post('/admin/auth/login', { adminId, password });
  if (res.data.token) {
    localStorage.setItem('adminToken', res.data.token);
    // Attach for future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
  }
  return res.data;
};

export const adminLogout = async () => {
  await api.post('/admin/auth/logout');
  localStorage.removeItem('adminToken');
};

export const getAdminMe = async (): Promise<Admin> => {
  // Use adminToken for this call
  const token = localStorage.getItem('adminToken');
  const res = await api.get('/admin/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data.admin;
};
