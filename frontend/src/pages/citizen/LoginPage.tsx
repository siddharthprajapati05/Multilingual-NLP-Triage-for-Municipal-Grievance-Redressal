import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { login } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/ui';

const LoginPage: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '', remember: false });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.identifier, form.password);
      setUser(res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-100 via-white to-warm-50 flex">
      {/* Left Illustration Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-primary-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/30" />
          <div className="absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-white/20" />
        </div>
        <div className="relative flex flex-col items-center justify-center h-full p-12 text-white">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <Building2 size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-3">Municipal Grievance<br />Redressal System</h1>
          <p className="text-primary-200 text-center text-sm leading-relaxed mb-10">
            AI-Powered · Multilingual · Citizen Centric
          </p>
          {/* Illustration icons */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {[
              { icon: '🗑️', label: 'Sanitation' },
              { icon: '💧', label: 'Water Supply' },
              { icon: '💡', label: 'Street Lighting' },
              { icon: '🛣️', label: 'Roads' },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                <div className="text-3xl mb-1">{icon}</div>
                <p className="text-xs text-primary-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Municipal Grievance</p>
              <p className="text-xs text-primary-600">Redressal System</p>
            </div>
          </div>

          <div className="card shadow-modal">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Citizen Portal</h2>
            <p className="text-sm text-gray-500 mb-6">Sign In to Your Account</p>

            {error && (
              <div className="mb-4">
                <Alert type="error" message={error} onClose={() => setError('')} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email or Mobile Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter email or mobile"
                  value={form.identifier}
                  onChange={e => setForm({ ...form, identifier: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input pr-10"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-warm-300"
                    checked={form.remember}
                    onChange={e => setForm({ ...form, remember: e.target.checked })}
                  />
                  Remember me
                </label>
              </div>

              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-700 font-semibold hover:underline">
                  Register
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Are you an administrator?{' '}
            <Link to="/admin/login" className="text-primary-600 hover:underline">Admin Portal →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
