import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Calendar, Globe, Sparkles, Send, Building2, Clock, Edit3 } from 'lucide-react';
import {
  getAdminComplaintById, assignComplaint, updateComplaintStatus, correctAIPrediction
} from '../../services/complaints';
import api from '../../services/api';
import { Complaint, Department } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, Alert, Modal } from '../../components/ui';
import { formatDateTime, getLanguageName } from '../../utils/helpers';

const CATEGORIES = [
  'Sanitation',
  'Water Supply',
  'Street Lighting',
  'Roads & Maintenance',
  'Parks & Recreation',
  'Electrical',
  'Health',
  'General',
];

const getTargetResolution = (createdAtStr: string, estimatedDays?: number, resolvedAt?: string) => {
  if (resolvedAt) {
    return {
      text: formatDateTime(resolvedAt),
      subtext: 'Resolved',
      status: 'resolved'
    };
  }
  if (!estimatedDays) {
    return {
      text: 'Standard SLA',
      subtext: 'Typically 7 days',
      status: 'standard'
    };
  }
  const created = new Date(createdAtStr);
  const target = new Date(created.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const targetStr = target.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (diffDays < 0) {
    return {
      text: targetStr,
      subtext: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      status: 'overdue'
    };
  }
  if (diffDays === 0) {
    return {
      text: targetStr,
      subtext: 'Due today (~' + estimatedDays + ' days SLA)',
      status: 'due-today'
    };
  }
  return {
    text: targetStr,
    subtext: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'} (~${estimatedDays} days total)`,
    status: 'on-track'
  };
};

const AdminComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ departmentId: '', assignedTo: '' });
  const [assignLoading, setAssignLoading] = useState(false);

  // Status modal
  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', remarks: '', resolution: '' });
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        getAdminComplaintById(id),
        api.get('/departments').then(r => r.data.departments),
      ]);
      setComplaint(c);
      setDepartments(d);
      setStatusForm({ status: c.status, remarks: '', resolution: '' });
    } catch {
      setError('Failed to load complaint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAssign = async () => {
    if (!assignForm.departmentId || !id) return;
    setAssignLoading(true);
    try {
      await assignComplaint(id, assignForm.departmentId, assignForm.assignedTo);
      setSuccess('Complaint assigned successfully.');
      setShowAssign(false);
      fetchData();
    } catch {
      setError('Failed to assign complaint.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.status || !id) return;
    setStatusLoading(true);
    try {
      await updateComplaintStatus(id, statusForm.status, statusForm.remarks, statusForm.resolution);
      setSuccess('Status updated successfully.');
      setShowStatus(false);
      fetchData();
    } catch {
      setError('Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (!complaint) return <Alert type="error" message="Complaint not found." />;

  return (
    <div className="animate-fade-in">
      <Link to="/admin/complaints" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline mb-4">
        <ArrowLeft size={14} /> ← Back to Complaints
      </Link>

      {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
      {success && <div className="mb-4"><Alert type="success" message={success} onClose={() => setSuccess('')} /></div>}

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Header */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Ticket ID</p>
                <p className="text-xl font-bold text-primary-700 font-mono">{complaint.ticketId}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={complaint.status} />
                <UrgencyBadge urgency={complaint.urgency} />
              </div>
            </div>

            {/* Complaint Text - Dual Language View */}
            <div className="space-y-3 mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Globe size={13} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Original Complaint ({getLanguageName(complaint.language)})
                  </span>
                </div>
                <div className="bg-warm-50/70 p-3.5 rounded-xl border border-warm-200">
                  <p className="text-gray-800 leading-relaxed font-medium">{complaint.originalText}</p>
                </div>
              </div>

              {complaint.language !== 'en' && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={13} className="text-primary-700" />
                    <span className="text-xs font-semibold text-primary-800 uppercase tracking-wider">
                      English Translation (AI Model)
                    </span>
                  </div>
                  <div className="bg-primary-50/50 p-3.5 rounded-xl border border-primary-200">
                    <p className="text-gray-800 leading-relaxed italic">
                      {complaint.translatedText ? `"${complaint.translatedText}"` : 'Translation in progress...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {complaint.photoUrl && (
              <img src={complaint.photoUrl} alt="Complaint" className="rounded-xl max-h-60 border border-warm-200 mb-4" />
            )}

            {/* Details */}
            {(() => {
              const targetRes = getTargetResolution(complaint.createdAt, complaint.estimatedDays, complaint.resolvedAt);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><User size={10} /> Citizen</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.user?.fullName}</p>
                    <p className="text-xs text-gray-400">{complaint.user?.email || complaint.user?.mobile}</p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.category || complaint.aiCategory || 'Unclassified'}</p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={10} /> Department</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {complaint.department?.name || (complaint.aiDepartment ? `${complaint.aiDepartment} (AI Assigned)` : 'Unassigned')}
                    </p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Globe size={10} /> Language</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{getLanguageName(complaint.language)}</p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} /> Submitted</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDateTime(complaint.createdAt)}</p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> Resolution Deadline</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{targetRes.text}</p>
                    <p className={`text-[11px] mt-0.5 font-medium ${
                      targetRes.status === 'overdue' ? 'text-red-600' :
                      targetRes.status === 'due-today' ? 'text-amber-600' :
                      targetRes.status === 'resolved' ? 'text-green-600' : 'text-primary-700'
                    }`}>
                      {targetRes.subtext}
                    </p>
                  </div>
                  {complaint.locality && (
                    <div className="bg-warm-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> Locality</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.locality}</p>
                    </div>
                  )}
                  {complaint.assignedTo && (
                    <div className="bg-warm-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.assignedTo}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* AI Classification */}
            {complaint.aiProcessed ? (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-800">AI Classification</span>
                  </div>
                  <span className="badge-resolved text-[10px]">Processed</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-500">Category:</span><br/><span className="font-semibold">{complaint.aiCategory}</span></div>
                  <div><span className="text-gray-500">Department:</span><br/><span className="font-semibold">{complaint.aiDepartment}</span></div>
                  <div><span className="text-gray-500">Urgency:</span><br/><span className="font-semibold">{complaint.aiUrgency}</span></div>
                  <div><span className="text-gray-500">Est. Resolution:</span><br/><span className="font-semibold">{complaint.estimatedDays ? `~${complaint.estimatedDays} days` : '—'}</span></div>
                </div>
                {complaint.translatedText && complaint.language !== 'en' && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-500 mb-1">English Translation</p>
                    <p className="text-sm text-gray-700 italic">"{complaint.translatedText}"</p>
                  </div>
                )}
                {complaint.aiConfidence && (
                  <p className="text-xs text-gray-400 mt-2">Confidence: {(complaint.aiConfidence * 100).toFixed(1)}%</p>
                )}
              </div>
            ) : (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-600" />
                  <span className="text-sm text-amber-800">AI classification pending — model not yet integrated.</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowAssign(true)} className="btn-primary">
              <Building2 size={14} /> Assign Department
            </button>
            <button onClick={() => setShowStatus(true)} className="btn-secondary">
              <Send size={14} /> Update Status
            </button>
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="card h-fit">
          <h3 className="font-bold text-gray-900 mb-4">Status History</h3>
          {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-warm-200" />
              {complaint.statusHistory.map((h, i) => (
                <div key={i} className="relative mb-5 last:mb-0">
                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    h.status === 'RESOLVED' ? 'bg-green-500' :
                    h.status === 'REJECTED' ? 'bg-red-500' :
                    h.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <StatusBadge status={h.status} />
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(h.changedAt)}</p>
                    {h.remarks && <p className="text-xs text-gray-600 mt-1">{h.remarks}</p>}
                    <p className="text-[10px] text-gray-400">by {h.changedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No history entries.</p>
          )}

          {/* Official Remarks */}
          {complaint.officialRemarks && (
            <div className="mt-6 border-t border-warm-200 pt-4">
              <p className="form-label">Official Remarks</p>
              <p className="text-sm text-gray-700">{complaint.officialRemarks}</p>
            </div>
          )}
          {complaint.resolution && (
            <div className="mt-4 bg-green-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-800">Resolution</p>
              <p className="text-sm text-green-700 mt-0.5">{complaint.resolution}</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Assign to Department">
        <div className="space-y-4">
          <div>
            <label className="form-label">Department *</label>
            <select
              className="form-input"
              value={assignForm.departmentId}
              onChange={e => setAssignForm({ ...assignForm, departmentId: e.target.value })}
            >
              <option value="">Select department…</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Assign to (officer name, optional)</label>
            <input
              className="form-input"
              placeholder="e.g., R. Kumar"
              value={assignForm.assignedTo}
              onChange={e => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAssign(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAssign} className="btn-primary flex-1" disabled={assignLoading || !assignForm.departmentId}>
              {assignLoading ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Update Complaint Status">
        <div className="space-y-4">
          <div>
            <label className="form-label">New Status *</label>
            <select
              className="form-input"
              value={statusForm.status}
              onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea
              className="form-input h-24 resize-none"
              placeholder="Add official remarks…"
              value={statusForm.remarks}
              onChange={e => setStatusForm({ ...statusForm, remarks: e.target.value })}
            />
          </div>
          {statusForm.status === 'RESOLVED' && (
            <div>
              <label className="form-label">Resolution Details</label>
              <textarea
                className="form-input h-20 resize-none"
                placeholder="Describe how the issue was resolved…"
                value={statusForm.resolution}
                onChange={e => setStatusForm({ ...statusForm, resolution: e.target.value })}
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowStatus(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleStatusUpdate} className="btn-primary flex-1" disabled={statusLoading}>
              {statusLoading ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminComplaintDetailPage;
