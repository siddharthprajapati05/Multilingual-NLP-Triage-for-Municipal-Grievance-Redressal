import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Shield, Eye, EyeOff } from 'lucide-react';
import { adminLogin } from '../../services/auth';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Alert } from '../../components/ui';

const AdminLoginPage: React.FC = () => {
  const { setAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ adminId: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(form.adminId, form.password);
      setAdmin(res.admin);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Municipal Grievance Redressal System</p>
        </div>

        <div className="card shadow-modal">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Administrator Login</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your admin credentials to continue.</p>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Admin ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter admin ID"
                value={form.adminId}
                onChange={e => setForm({ ...form, adminId: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="Enter admin password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Authenticating…' : 'Login as Admin →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            <Link to="/login" className="text-primary-600 hover:underline">← Back to Citizen Portal</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
