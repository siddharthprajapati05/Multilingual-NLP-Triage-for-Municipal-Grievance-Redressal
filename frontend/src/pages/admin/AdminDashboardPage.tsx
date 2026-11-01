import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, TrendingDown, Eye, ClipboardList, Building2, BarChart3
} from 'lucide-react';
import { getAdminStats, getAllComplaints } from '../../services/complaints';
import api from '../../services/api';
import { Complaint, AdminStats } from '../../types';
import { StatusBadge, UrgencyBadge, Spinner } from '../../components/ui';
import { formatDate, truncate } from '../../utils/helpers';

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      getAdminStats(),
      getAllComplaints({ limit: 5 }),
    ]).then(([s, c]) => {
      setStats(s);
      setRecent(c.complaints);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const statCards = [
    { label: 'Total Complaints', value: stats?.total ?? 0, icon: FileText, color: 'bg-warm-100 text-primary-700', trend: '+12%' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-700', trend: '+5%' },
    { label: 'In Progress', value: stats?.inProgress ?? 0, icon: AlertTriangle, color: 'bg-blue-50 text-blue-700', trend: '-8%' },
    { label: 'Resolved', value: stats?.resolved ?? 0, icon: CheckCircle, color: 'bg-green-50 text-green-700', trend: '+18%' },
  ];

  const urgencyData = stats?.urgencyStats || [];
  const categoryData = stats?.categoryStats || [];

  const getUrgencyCount = (u: string) =>
    urgencyData.find(d => d.urgency === u)?._count?.urgency ?? 0;

  return (
    <div className="animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`stat-icon ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">{trend} <span className="text-gray-400">vs last month</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-8">
        {/* Category Distribution */}
        <div className="xl:col-span-1 card">
          <h3 className="font-bold text-gray-900 mb-4">Complaints by Category</h3>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.slice(0, 6).map((cat, i) => {
                const total = stats?.total ?? 1;
                const pct = Math.round(((cat._count?.category ?? 0) / total) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{cat.category || 'Uncategorized'}</span>
                      <span className="font-semibold text-gray-800">{pct}%</span>
                    </div>
                    <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No category data yet.</p>
          )}
        </div>

        {/* Urgency Stats */}
        <div className="xl:col-span-1 card">
          <h3 className="font-bold text-gray-900 mb-4">Complaints by Urgency</h3>
          <div className="space-y-4">
            {[
              { label: 'High', key: 'HIGH', color: 'bg-red-500', icon: '🔴' },
              { label: 'Medium', key: 'MEDIUM', color: 'bg-amber-500', icon: '🟡' },
              { label: 'Low', key: 'LOW', color: 'bg-green-500', icon: '🟢' },
            ].map(({ label, key, color, icon }) => (
              <div key={key} className="flex items-center gap-4 bg-warm-50 rounded-xl p-4">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <div className="h-1.5 bg-warm-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full`}
                      style={{ width: `${Math.min(100, ((getUrgencyCount(key) / (stats?.total || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{getUrgencyCount(key)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="xl:col-span-1 card">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ClipboardList, label: 'Assign Complaint', to: '/admin/assign', color: 'text-primary-700' },
              { icon: Clock, label: 'Update Status', to: '/admin/complaints', color: 'text-blue-700' },
              { icon: Building2, label: 'Manage Depts', to: '/admin/departments', color: 'text-green-700' },
              { icon: BarChart3, label: 'View Reports', to: '/admin/analytics', color: 'text-amber-700' },
            ].map(({ icon: Icon, label, to, color }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-warm-200 hover:border-primary-300 hover:bg-warm-50 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Recent Complaints</h3>
          <Link to="/admin/complaints" className="text-sm text-primary-700 hover:underline font-medium">
            View All →
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Complaint ID</th>
                <th className="hidden sm:table-cell">Description</th>
                <th className="hidden md:table-cell">Category</th>
                <th className="hidden md:table-cell">Department</th>
                <th>Urgency</th>
                <th>Status</th>
                <th className="hidden lg:table-cell">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.id}>
                  <td className="font-mono font-bold text-primary-700 text-xs">{c.ticketId}</td>
                  <td className="hidden sm:table-cell max-w-[200px] truncate text-xs">{truncate(c.originalText, 35)}</td>
                  <td className="hidden md:table-cell text-xs">{c.category || '—'}</td>
                  <td className="hidden md:table-cell text-xs">{c.department?.name || '—'}</td>
                  <td><UrgencyBadge urgency={c.urgency} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="hidden lg:table-cell text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                  <td>
                    <Link to={`/admin/complaints/${c.id}`} className="text-primary-600 hover:text-primary-800">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No complaints yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
