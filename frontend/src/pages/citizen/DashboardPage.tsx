import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, Search, History, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getMyCitizenStats, getMyComplaints } from '../../services/complaints';
import { CitizenStats, Complaint } from '../../types';
import { StatusBadge, Spinner } from '../../components/ui';
import { formatDate, truncate } from '../../utils/helpers';

const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CitizenStats | null>(null);
  const [recent, setRecent] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyCitizenStats(),
      getMyComplaints({ limit: 3 }),
    ]).then(([s, c]) => {
      setStats(s);
      setRecent(c.complaints);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, color: 'bg-warm-100 text-primary-700', icon: '📋' },
    { label: 'In Progress', value: stats?.inProgress ?? 0, color: 'bg-blue-50 text-blue-700', icon: '⏳' },
    { label: 'Resolved', value: stats?.resolved ?? 0, color: 'bg-green-50 text-green-700', icon: '✅' },
    { label: 'Pending', value: stats?.pending ?? 0, color: 'bg-amber-50 text-amber-700', icon: '⏰' },
  ];

  const quickActions = [
    { icon: FilePlus, label: 'Submit New Complaint', to: '/submit', color: 'text-primary-700' },
    { icon: Search, label: 'Track Complaint', to: '/track', color: 'text-blue-700' },
    { icon: History, label: 'View History', to: '/history', color: 'text-green-700' },
    { icon: HelpCircle, label: 'Help & FAQs', to: '/profile', color: 'text-amber-700' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.fullName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Raise, track and manage your municipal complaints easily.</p>
        </div>
        <Link to="/submit" className="btn-primary hidden sm:inline-flex">
          <FilePlus size={16} />
          Submit Complaint
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, color, icon }) => (
          <div key={label} className="card text-center">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-3 text-2xl`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ icon: Icon, label, to, color }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-warm-200 hover:border-primary-300 hover:bg-warm-50 transition-all duration-150 text-center"
              >
                <div className={`w-9 h-9 rounded-xl bg-warm-100 flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Complaints</h2>
            <Link to="/history" className="text-sm text-primary-700 hover:underline font-medium">
              View All →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">No complaints submitted yet.</p>
              <Link to="/submit" className="btn-primary mt-4 text-xs py-2">Submit Your First Complaint</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(c => (
                <Link
                  key={c.id}
                  to={`/complaint/${c.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-warm-50 border border-transparent hover:border-warm-200 transition-all duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary-700">{c.ticketId}</p>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{truncate(c.originalText, 60)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
