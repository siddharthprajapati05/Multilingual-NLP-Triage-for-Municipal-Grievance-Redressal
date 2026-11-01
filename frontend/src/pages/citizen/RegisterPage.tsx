import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Check } from 'lucide-react';
import { register } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/ui';
import { LANGUAGES } from '../../utils/helpers';

const RegisterPage: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1); // 1: details, 2: language select
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredLang: 'en',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email && !form.mobile) {
      setError('Please provide either email or mobile number.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await register({
        fullName: form.fullName,
        email: form.email || undefined,
        mobile: form.mobile || undefined,
        password: form.password,
        preferredLang: form.preferredLang,
      });
      setUser(res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-100 via-white to-warm-50 flex">
      {/* Left Panel */}
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
          <p className="text-primary-200 text-center text-sm leading-relaxed">
            Register to track your complaints, get AI-powered categorization, and receive real-time updates in your preferred language.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="card shadow-modal">
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Your Account</h2>
                <p className="text-sm text-gray-500 mb-6">Register as a Citizen</p>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                <form onSubmit={handleStep1} className="space-y-4">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Mobile Number</label>
                    <input
                      className="form-input"
                      placeholder="10-digit mobile number"
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Email (Optional)</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter email address"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Password *</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
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
                  <div>
                    <label className="form-label">Confirm Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3">
                    Continue →
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-700 font-semibold hover:underline">Sign In</Link>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Select Your Preferred Language</h2>
                <p className="text-sm text-gray-500 mb-6">You can change this later from settings.</p>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-6">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setForm({ ...form, preferredLang: lang.code })}
                      className={`relative p-3 rounded-xl border-2 text-center transition-all duration-150 ${
                        form.preferredLang === lang.code
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-warm-200 hover:border-primary-300'
                      }`}
                    >
                      {form.preferredLang === lang.code && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                      <div className="text-lg font-bold text-primary-700">{lang.script}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{lang.name}</div>
                    </button>
                  ))}
                </div>

                <button onClick={handleRegister} className="btn-primary w-full py-3" disabled={loading}>
                  {loading ? 'Creating Account…' : 'Register →'}
                </button>
                <button onClick={() => setStep(1)} className="btn-ghost w-full mt-2">← Back</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
