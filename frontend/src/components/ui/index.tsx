import React from 'react';
import { ComplaintStatus, ComplaintUrgency } from '../../types';
import { statusLabel, statusBadgeClass, urgencyLabel, urgencyBadgeClass } from '../../utils/helpers';

interface StatusBadgeProps {
  status: ComplaintStatus;
}

interface UrgencyBadgeProps {
  urgency: ComplaintUrgency;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={statusBadgeClass[status]}>
    {statusLabel[status]}
  </span>
);

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency }) => (
  <span className={urgencyBadgeClass[urgency]}>
    {urgencyLabel[urgency]}
  </span>
);

// ─── Loading Spinner ──────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return <div className={`spinner ${sizeClass} ${className}`} />;
};

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-5xl mb-4 opacity-40">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>}
    {action}
  </div>
);

// ─── Alert / Toast ────────────────────────────────────────────────────────────
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[type]} animate-fade-in`}>
      <span className="font-bold mt-0.5">{icons[type]}</span>
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 font-bold">✕</button>
      )}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} bg-white rounded-2xl shadow-modal p-6 animate-fade-in`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 -mr-2">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        className="btn-secondary px-3 py-1.5 text-xs"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ‹ Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-secondary px-3 py-1.5 text-xs"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next ›
      </button>
    </div>
  );
};
