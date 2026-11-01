import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, ChevronDown } from 'lucide-react';
import { getAllComplaints } from '../../services/complaints';
import { Complaint, Pagination as PaginationType } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, Pagination } from '../../components/ui';
import { formatDate, truncate } from '../../utils/helpers';

const AdminComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    urgency: 'ALL',
    page: 1,
  });

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: filters.page, limit: 15 };
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.urgency !== 'ALL') params.urgency = filters.urgency;
      if (filters.search) params.search = filters.search;
      const res = await getAllComplaints(params);
      setComplaints(res.complaints);
      setPagination(res.pagination);
    } catch { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters.status, filters.urgency, filters.page]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">All Complaints</h1>
        <p className="page-subtitle">Manage and review all citizen complaints.</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search by ID, text, or citizen name…"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && fetch()}
            />
          </div>
          <select
            className="form-input w-full md:w-36"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            className="form-input w-full md:w-36"
            value={filters.urgency}
            onChange={e => setFilters({ ...filters, urgency: e.target.value, page: 1 })}
          >
            <option value="ALL">All Urgency</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button onClick={fetch} className="btn-primary md:px-6">
            <Filter size={14} /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th className="hidden sm:table-cell">Citizen</th>
                    <th className="hidden md:table-cell">Description</th>
                    <th className="hidden md:table-cell">Category</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th className="hidden lg:table-cell">Department</th>
                    <th className="hidden lg:table-cell">Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-primary-700 text-xs">{c.ticketId}</td>
                      <td className="hidden sm:table-cell text-xs">{c.user?.fullName || '—'}</td>
                      <td className="hidden md:table-cell max-w-[180px] truncate text-xs">{truncate(c.originalText, 30)}</td>
                      <td className="hidden md:table-cell text-xs">{c.category || '—'}</td>
                      <td><UrgencyBadge urgency={c.urgency} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="hidden lg:table-cell text-xs">{c.department?.name || '—'}</td>
                      <td className="hidden lg:table-cell text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                      <td>
                        <Link
                          to={`/admin/complaints/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                        >
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">No complaints found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={p => setFilters({ ...filters, page: p })} />
          )}
        </>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
