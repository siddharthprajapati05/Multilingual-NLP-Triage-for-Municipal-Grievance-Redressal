import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { trackComplaint } from '../../services/complaints';
import { Complaint } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, Alert } from '../../components/ui';
import { formatDateTime, getLanguageName } from '../../utils/helpers';

const statusSteps = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];

const TrackComplaintPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [ticketId, setTicketId] = useState(searchParams.get('id') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setTicketId(id);
      handleSearch(id);
    }
  }, []);

  const handleSearch = async (id?: string) => {
    const search = id || ticketId;
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    setComplaint(null);
    try {
      const c = await trackComplaint(search.trim().toUpperCase());
      setComplaint(c);
    } catch {
      setError('Complaint not found. Please check your ticket ID.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = complaint
    ? complaint.status === 'REJECTED'
      ? -1
      : statusSteps.indexOf(complaint.status)
    : -1;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Track Your Complaint</h1>
        <p className="page-subtitle">Enter your complaint ID to check the current status.</p>
      </div>

      <div className="card mb-6">
        <div className="flex gap-3">
          <input
            className="form-input flex-1"
            placeholder="e.g., MGR123456"
            value={ticketId}
            onChange={e => setTicketId(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="btn-primary px-6"
          >
            {loading ? <Spinner size="sm" /> : <><Search size={16} /> Track</>}
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError('')} />
      )}

      {complaint && (
        <div className="card animate-fade-in">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-warm-200">
            <div>
              <p className="text-xs text-gray-500 font-medium">Complaint ID</p>
              <p className="text-xl font-bold text-primary-700 font-mono">{complaint.ticketId}</p>
            </div>
            <StatusBadge status={complaint.status} />
          </div>

          {/* Complaint Text */}
          <div className="mb-6">
            <p className="form-label">Complaint</p>
            <p className="text-gray-700">{complaint.originalText}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {complaint.category && (
              <div className="bg-warm-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.category}</p>
              </div>
            )}
            {complaint.department && (
              <div className="bg-warm-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.department.name}</p>
              </div>
            )}
            <div className="bg-warm-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Urgency</p>
              <UrgencyBadge urgency={complaint.urgency} />
            </div>
            <div className="bg-warm-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Language</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{getLanguageName(complaint.language)}</p>
            </div>
            <div className="bg-warm-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Submitted On</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDateTime(complaint.createdAt)}</p>
            </div>
            {complaint.locality && (
              <div className="bg-warm-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Locality</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.locality}</p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          {complaint.status !== 'REJECTED' && (
            <div className="mb-6">
              <p className="form-label mb-4">Progress</p>
              <div className="flex items-center gap-0">
                {statusSteps.map((step, i) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        i <= currentStep
                          ? 'bg-primary-700 border-primary-700 text-white'
                          : 'border-warm-300 text-gray-400'
                      }`}>
                        {i < currentStep ? '✓' : i + 1}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 text-center w-20">
                        {step === 'PENDING' ? 'Submitted' : step === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
                      </p>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 -mt-5 ${i < currentStep ? 'bg-primary-600' : 'bg-warm-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          {complaint.statusHistory && complaint.statusHistory.length > 0 && (
            <div>
              <p className="form-label mb-4">Resolution Timeline</p>
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-warm-200" />
                {complaint.statusHistory.map((h, i) => (
                  <div key={i} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-4 w-3 h-3 rounded-full bg-primary-600 border-2 border-white shadow-sm" />
                    <div className="bg-warm-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-gray-400">{formatDateTime(h.changedAt)}</span>
                      </div>
                      {h.remarks && <p className="text-sm text-gray-600">{h.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackComplaintPage;
