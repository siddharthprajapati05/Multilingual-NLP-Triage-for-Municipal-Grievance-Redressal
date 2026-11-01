// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email?: string;
  mobile?: string;
  preferredLang: string;
  createdAt?: string;
}

export interface Admin {
  id: string;
  name: string;
  role: 'admin';
}

// ─── Complaint ────────────────────────────────────────────────────────────────
export type ComplaintStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ComplaintUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Complaint {
  id: string;
  ticketId: string;
  userId: string;
  originalText: string;
  language: string;
  category?: string;
  urgency: ComplaintUrgency;
  status: ComplaintStatus;
  photoUrl?: string;
  locality?: string;
  address?: string;
  aiCategory?: string;
  aiDepartment?: string;
  aiUrgency?: string;
  aiConfidence?: number;
  aiProcessed: boolean;
  assignedTo?: string;
  officialRemarks?: string;
  resolution?: string;
  departmentId?: string;
  department?: { name: string; code?: string };
  user?: { id: string; fullName: string; email?: string; mobile?: string };
  statusHistory?: StatusHistory[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface StatusHistory {
  id: string;
  complaintId: string;
  status: ComplaintStatus;
  remarks?: string;
  changedBy: string;
  changedAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface AdminStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  urgencyStats: Array<{ urgency: ComplaintUrgency; _count: { urgency: number } }>;
  categoryStats: Array<{ category: string; _count: { category: number } }>;
  deptStats: Array<{ departmentId: string; _count: { departmentId: number } }>;
}

export interface CitizenStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Languages ────────────────────────────────────────────────────────────────
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  script?: string;
}
