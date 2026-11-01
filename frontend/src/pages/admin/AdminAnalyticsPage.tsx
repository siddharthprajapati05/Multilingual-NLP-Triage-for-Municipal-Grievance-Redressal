import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../components/ui';

const AdminAnalyticsPage: React.FC = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [languageData, setLanguageData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [trends, setTrends] = useState<Record<string, { total: number; resolved: number }>>({});
  const [loading, setLoading] = useState(true);

  const adminHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    Promise.all([
      api.get('/analytics/categories', { headers: adminHeader() }),
      api.get('/analytics/languages', { headers: adminHeader() }),
      api.get('/analytics/departments', { headers: adminHeader() }),
      api.get('/analytics/trends', { headers: adminHeader() }),
    ]).then(([cats, langs, depts, t]) => {
      setCategoryData(cats.data.categories || []);
      setLanguageData(langs.data.languages || []);
      setDeptData(depts.data.departments || []);
      setTrends(t.data.trends || {});
    }).finally(() => setLoading(false));
  }, []);

  const maxCategory = Math.max(...categoryData.map(c => c._count?.category || 0), 1);
  const maxLang = Math.max(...languageData.map(l => l._count?.language || 0), 1);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics & Reports</h1>
        <p className="page-subtitle">Insights into complaint patterns and department performance.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Complaints by Category</h3>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 font-medium">{c.category || 'Uncategorized'}</span>
                    <span className="font-bold text-gray-900">{c._count?.category ?? 0}</span>
                  </div>
                  <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-700 rounded-full transition-all duration-700"
                      style={{ width: `${((c._count?.category || 0) / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No category data yet.</p>
          )}
        </div>

        {/* Language Breakdown */}
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Complaints by Language</h3>
          {languageData.length > 0 ? (
            <div className="space-y-3">
              {languageData.map((l, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 font-medium">{l.language?.toUpperCase() || '—'}</span>
                    <span className="font-bold text-gray-900">{l._count?.language ?? 0}</span>
                  </div>
                  <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700"
                      style={{ width: `${((l._count?.language || 0) / maxLang) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No language data yet.</p>
          )}
        </div>
      </div>

      {/* Department Performance */}
      <div className="card mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Department Performance</h3>
        {deptData.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {deptData.map(d => {
                  const rate = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
                  return (
                    <tr key={d.id}>
                      <td className="font-semibold text-sm">{d.name}</td>
                      <td className="font-bold">{d.total}</td>
                      <td><span className="badge-pending">{d.pending}</span></td>
                      <td><span className="badge-in-progress">{d.inProgress}</span></td>
                      <td><span className="badge-resolved">{d.resolved}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">No department data yet.</p>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">Monthly Complaint Trend</h3>
        {Object.keys(trends).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(trends).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => (
              <div key={month} className="flex items-center gap-4">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0 font-mono">{month}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-6 bg-warm-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-primary-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(100, (data.total / Math.max(...Object.values(trends).map(t => t.total), 1)) * 100)}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{data.total}</span>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 font-semibold w-20 text-right">{data.resolved} resolved</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">No trend data available yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
