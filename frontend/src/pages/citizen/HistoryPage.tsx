import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { getMyComplaints } from '../../services/complaints';
import { Complaint, Pagination as PaginationType } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner, EmptyState, Pagination } from '../../components/ui';
import { formatDate, truncate } from '../../utils/helpers';

const statusOptions = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

const HistoryPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await getMyComplaints({
        status: statusFilter,
        search: search || undefined,
        page,
        limit: 10,
      });
      setComplaints(res.complaints);
      setPagination(res.pagination);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, page]);

  const handleSearch = () => {
    setPage(1);
    fetchComplaints();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Complaint History</h1>
        <p className="page-subtitle">All your submitted complaints.</p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search by ticket ID, text, or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            className="form-input w-full sm:w-40"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {statusOptions.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={handleSearch} className="btn-primary sm:px-6">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No complaints found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th className="hidden sm:table-cell">Complaint</th>
                    <th className="hidden md:table-cell">Category</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-primary-700 text-xs">{c.ticketId}</td>
                      <td className="hidden sm:table-cell max-w-[200px] truncate">{truncate(c.originalText, 40)}</td>
                      <td className="hidden md:table-cell text-xs">{c.category || '—'}</td>
                      <td><UrgencyBadge urgency={c.urgency} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="hidden sm:table-cell text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                      <td>
                        <Link to={`/complaint/${c.id}`} className="text-primary-600 hover:text-primary-800">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default HistoryPage;
