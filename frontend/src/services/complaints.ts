import api from './api';
import { Complaint, Pagination, CitizenStats } from '../types';

const adminHeader = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Citizen ──────────────────────────────────────────────────────────────────
export const submitComplaint = async (formData: FormData): Promise<{
  ticketId: string;
  complaint: Partial<Complaint>;
}> => {
  const res = await api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getMyComplaints = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ complaints: Complaint[]; pagination: Pagination }> => {
  const res = await api.get('/complaints/my', { params });
  return res.data;
};

export const getComplaintById = async (id: string): Promise<Complaint> => {
  const res = await api.get(`/complaints/${id}`);
  return res.data.complaint;
};

export const trackComplaint = async (ticketId: string): Promise<Complaint> => {
  const res = await api.get(`/complaints/track/${ticketId}`);
  return res.data.complaint;
};

export const getMyCitizenStats = async (): Promise<CitizenStats> => {
  const res = await api.get('/complaints/stats/me');
  return res.data.stats;
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminStats = async () => {
  const res = await api.get('/admin/stats', { headers: adminHeader() });
  return res.data.stats;
};

export const getAllComplaints = async (params?: Record<string, string | number>) => {
  const res = await api.get('/admin/complaints', { params, headers: adminHeader() });
  return res.data;
};

export const getAdminComplaintById = async (id: string): Promise<Complaint> => {
  const res = await api.get(`/admin/complaints/${id}`, { headers: adminHeader() });
  return res.data.complaint;
};

export const assignComplaint = async (id: string, departmentId: string, assignedTo?: string) => {
  const res = await api.patch(
    `/admin/complaints/${id}/assign`,
    { departmentId, assignedTo },
    { headers: adminHeader() }
  );
  return res.data;
};

export const updateComplaintStatus = async (
  id: string,
  status: string,
  remarks?: string,
  resolution?: string
) => {
  const res = await api.patch(
    `/admin/complaints/${id}/status`,
    { status, remarks, resolution },
    { headers: adminHeader() }
  );
  return res.data;
};

export const correctAIPrediction = async (
  id: string,
  data: { category?: string; departmentId?: string; urgency?: string }
) => {
  const res = await api.patch(`/admin/complaints/${id}/ai-correction`, data, { headers: adminHeader() });
  return res.data;
};

export const getAllCitizens = async (params?: Record<string, string | number>) => {
  const res = await api.get('/admin/citizens', { params, headers: adminHeader() });
  return res.data;
};

export const toggleCitizenStatus = async (id: string) => {
  const res = await api.patch(`/admin/citizens/${id}/toggle`, {}, { headers: adminHeader() });
  return res.data;
};
