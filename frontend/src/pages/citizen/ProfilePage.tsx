import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../services/auth';
import { Alert } from '../../components/ui';
import { LANGUAGES } from '../../utils/helpers';
import { User as UserIcon, Mail, Phone, Globe, Save } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    preferredLang: user?.preferredLang || 'en',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const updated = await updateProfile(form);
      setUser({ ...user!, ...updated });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account information.</p>
      </div>

      {message && (
        <div className="mb-4">
          <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      {/* Profile Header */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
          {user?.fullName?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{user?.fullName}</h2>
          <p className="text-sm text-gray-500">{user?.email || user?.mobile}</p>
          {user?.createdAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-6">
        <div>
          <label className="form-label flex items-center gap-1"><UserIcon size={12} /> Full Name</label>
          <input
            className="form-input"
            value={form.fullName}
            onChange={e => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="form-label flex items-center gap-1"><Mail size={12} /> Email</label>
          <input className="form-input bg-warm-50" value={user?.email || '—'} disabled />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed from here.</p>
        </div>

        <div>
          <label className="form-label flex items-center gap-1"><Phone size={12} /> Mobile</label>
          <input className="form-input bg-warm-50" value={user?.mobile || '—'} disabled />
        </div>

        <div>
          <label className="form-label flex items-center gap-1"><Globe size={12} /> Preferred Language</label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setForm({ ...form, preferredLang: lang.code })}
                className={`p-2 rounded-lg border text-center text-xs transition-all ${
                  form.preferredLang === lang.code
                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                    : 'border-warm-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                <div className="font-bold">{lang.script}</div>
                <div className="text-[10px] mt-0.5">{lang.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          <Save size={14} />
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
