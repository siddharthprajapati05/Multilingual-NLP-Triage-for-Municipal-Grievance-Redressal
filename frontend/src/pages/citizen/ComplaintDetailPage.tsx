import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Globe, Sparkles } from 'lucide-react';
import { getComplaintById } from '../../services/complaints';
import { Complaint } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, Alert } from '../../components/ui';
import { formatDateTime, getLanguageName } from '../../utils/helpers';

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
    <div className="animate-fade-in max-w-3xl mx-auto">
      <Link to="/history" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline mb-4">
        <ArrowLeft size={14} /> ← Complaint Details
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Complaint ID</p>
                <p className="text-xl font-bold text-primary-700 font-mono">{complaint.ticketId}</p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            <div className="mb-4">
              <p className="form-label">Complaint</p>
              <p className="text-gray-700 leading-relaxed">{complaint.originalText}</p>
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
            <div className="grid grid-cols-2 gap-3 mt-6">
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
                <div className="mt-0.5"><UrgencyBadge urgency={complaint.urgency} /></div>
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

            {/* AI Status */}
            {complaint.aiProcessed ? (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-800">AI Classified</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-gray-500">Category:</span><br/><span className="font-semibold">{complaint.aiCategory}</span></div>
                  <div><span className="text-gray-500">Department:</span><br/><span className="font-semibold">{complaint.aiDepartment}</span></div>
                  <div><span className="text-gray-500">Urgency:</span><br/><span className="font-semibold">{complaint.aiUrgency}</span></div>
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
        <div className="card h-fit">
          <h3 className="font-bold text-gray-900 mb-4">Resolution Timeline</h3>
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
                    {h.remarks && <p className="text-xs text-gray-600 mt-1">{h.remarks}</p>}
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
  );
};

export default ComplaintDetailPage;
