import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, ChevronRight } from 'lucide-react';
import { getAllCitizens, toggleCitizenStatus } from '../../services/complaints';
import { Spinner, Pagination, Alert } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { Pagination as PaginationType } from '../../types';

interface CitizenRow {
  id: string;
  fullName: string;
  email?: string;
  mobile?: string;
  preferredLang: string;
  isActive: boolean;
  createdAt: string;
  _count: { complaints: number };
}

const AdminCitizensPage: React.FC = () => {
  const [citizens, setCitizens] = useState<CitizenRow[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      const res = await getAllCitizens(params);
      setCitizens(res.users);
      setPagination(res.pagination);
    } catch { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page]);

  const handleToggle = async (id: string) => {
    try {
      await toggleCitizenStatus(id);
      setMessage('Citizen status updated.');
      fetch();
    } catch {
      setMessage('Failed to update citizen.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Manage Citizens</h1>
        <p className="page-subtitle">View and manage registered citizen accounts.</p>
      </div>

      {message && <div className="mb-4"><Alert type="success" message={message} onClose={() => setMessage('')} /></div>}

      <div className="card mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search by name, email, or mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetch()}
            />
          </div>
          <button onClick={fetch} className="btn-primary px-6">Search</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="hidden sm:table-cell">Email</th>
                    <th className="hidden md:table-cell">Mobile</th>
                    <th className="hidden md:table-cell">Language</th>
                    <th>Complaints</th>
                    <th>Status</th>
                    <th className="hidden lg:table-cell">Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {citizens.map(c => (
                    <tr key={c.id}>
                      <td className="font-semibold text-sm">{c.fullName}</td>
                      <td className="hidden sm:table-cell text-xs text-gray-500">{c.email || '—'}</td>
                      <td className="hidden md:table-cell text-xs text-gray-500">{c.mobile || '—'}</td>
                      <td className="hidden md:table-cell text-xs">{c.preferredLang.toUpperCase()}</td>
                      <td className="text-center font-semibold">{c._count.complaints}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                      <td>
                        <button
                          onClick={() => handleToggle(c.id)}
                          className={`text-xs font-medium ${c.isActive ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'}`}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {citizens.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No citizens found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
};

export default AdminCitizensPage;
