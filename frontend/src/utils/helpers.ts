import { ComplaintStatus, ComplaintUrgency, Language } from '../types';

// ─── Status helpers ───────────────────────────────────────────────────────────
export const statusLabel: Record<ComplaintStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const statusBadgeClass: Record<ComplaintStatus, string> = {
  PENDING: 'badge-pending',
  IN_PROGRESS: 'badge-in-progress',
  RESOLVED: 'badge-resolved',
  REJECTED: 'badge-rejected',
};

export const urgencyLabel: Record<ComplaintUrgency, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const urgencyBadgeClass: Record<ComplaintUrgency, string> = {
  LOW: 'badge-low',
  MEDIUM: 'badge-medium',
  HIGH: 'badge-high',
};

// ─── Date formatting ──────────────────────────────────────────────────────────
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = (now - then) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Languages ────────────────────────────────────────────────────────────────
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', script: 'हि' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'ਪ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'த' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'త' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'ব' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'म' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'ગ' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'ಕ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'മ' },
];

export const getLanguageName = (code: string): string =>
  LANGUAGES.find(l => l.code === code)?.name || code.toUpperCase();

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const truncate = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n) + '…' : str;

export const categoryIcons: Record<string, string> = {
  Sanitation: '🗑️',
  'Water Supply': '💧',
  'Street Lighting': '💡',
  'Roads & Maintenance': '🛣️',
  'Parks & Recreation': '🌳',
  Electrical: '⚡',
  Health: '🏥',
  General: '📋',
};
