import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Globe, Sparkles, Clock } from 'lucide-react';
import { getComplaintById } from '../../services/complaints';
import { Complaint } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, Alert } from '../../components/ui';
import { formatDateTime, getLanguageName } from '../../utils/helpers';

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
      subtext: 'Due today (~' + estimatedDays + ' days)',
      status: 'due-today'
    };
  }
  return {
    text: targetStr,
    subtext: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'} (~${estimatedDays} days)`,
    status: 'on-track'
  };
};

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getComplaintById(id)
      .then(setComplaint)
      .catch(() => setError('Failed to load complaint.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (error) return <Alert type="error" message={error} />;
  if (!complaint) return <Alert type="error" message="Complaint not found." />;

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto">
      <Link to="/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline mb-4">
        <ArrowLeft size={16} /> Back to Complaints
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* Main Details */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Complaint ID</p>
                <p className="text-xl font-bold text-primary-700 font-mono">{complaint.ticketId}</p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            {/* Complaint Text - Dual Language View */}
            <div className="space-y-3 mb-5">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Globe size={13} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Complaint ({getLanguageName(complaint.language)})
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
              <div className="mt-4">
                <p className="form-label">Attached Photo</p>
                <img
                  src={complaint.photoUrl}
                  alt="Complaint photo"
                  className="rounded-xl max-h-60 object-cover border border-warm-200"
                />
              </div>
            )}

            {/* Details Grid */}
            {(() => {
              const targetRes = getTargetResolution(complaint.createdAt, complaint.estimatedDays, complaint.resolvedAt);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mt-6">
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.category || complaint.aiCategory || 'Unclassified'}</p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {complaint.department?.name || (complaint.aiDepartment ? `${complaint.aiDepartment} (AI Assigned)` : 'Assigned pending')}
                    </p>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Urgency</p>
                    <div className="mt-0.5"><UrgencyBadge urgency={complaint.urgency} /></div>
                  </div>
                  <div className="bg-warm-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> Target Resolution</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{targetRes.text}</p>
                    <p className={`text-[11px] mt-0.5 font-medium ${
                      targetRes.status === 'overdue' ? 'text-red-600' :
                      targetRes.status === 'due-today' ? 'text-amber-600' :
                      targetRes.status === 'resolved' ? 'text-green-600' : 'text-primary-700'
                    }`}>
                      {targetRes.subtext}
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
                  {complaint.locality && (
                    <div className="bg-warm-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> Locality</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{complaint.locality}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* AI Status */}
            {complaint.aiProcessed ? (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-800">AI Classified</span>
                  </div>
                  {complaint.aiConfidence && (
                    <span className="text-xs text-green-700 font-medium">
                      {(complaint.aiConfidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-500">Category:</span><br/><span className="font-semibold text-gray-800">{complaint.aiCategory}</span></div>
                  <div><span className="text-gray-500">Department:</span><br/><span className="font-semibold text-gray-800">{complaint.aiDepartment}</span></div>
                  <div><span className="text-gray-500">Urgency:</span><br/><span className="font-semibold text-gray-800">{complaint.aiUrgency}</span></div>
                  <div><span className="text-gray-500">Est. Resolution:</span><br/><span className="font-semibold text-gray-800">{complaint.estimatedDays ? `~${complaint.estimatedDays} days` : '—'}</span></div>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-600" />
                  <span className="text-sm text-amber-800">AI classification pending — model integration in progress.</span>
                </div>
              </div>
            )}

            {/* Official Response */}
            {complaint.officialRemarks && (
              <div className="mt-4 border border-warm-200 rounded-xl p-4">
                <p className="form-label">Official Remarks</p>
                <p className="text-gray-700">{complaint.officialRemarks}</p>
              </div>
            )}
            {complaint.resolution && (
              <div className="mt-3 border border-green-200 bg-green-50 rounded-xl p-4">
                <p className="form-label text-green-800">Resolution</p>
                <p className="text-green-700">{complaint.resolution}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="card sticky top-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Resolution Timeline</span>
              <span className="text-xs font-normal text-gray-400">Live Status</span>
            </h3>
            {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-warm-200" />
                {complaint.statusHistory.map((h, i) => (
                  <div key={i} className="relative mb-5 last:mb-0">
                    <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      h.status === 'RESOLVED' ? 'bg-green-500' :
                      h.status === 'REJECTED' ? 'bg-red-500' :
                      h.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`} />
                    <div>
                      <StatusBadge status={h.status} />
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(h.changedAt)}</p>
                      {h.remarks && (
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed break-words bg-warm-50/70 rounded-lg p-2 border border-warm-100">
                          {h.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No timeline entries yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
