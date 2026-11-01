import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Mic, Type, Sparkles, CheckCircle } from 'lucide-react';
import { submitComplaint } from '../../services/complaints';
import api from '../../services/api';
import { Alert, Spinner } from '../../components/ui';
import { LANGUAGES } from '../../utils/helpers';
import { Department } from '../../types';

const MAX_TEXT = 500;

const SubmitComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'preview' | 'success'>('form');
  const [form, setForm] = useState({
    text: '',
    language: 'en',
    locality: '',
    address: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [inputMode, setInputMode] = useState<'type' | 'voice'>('type');
  const fileRef = useRef<HTMLInputElement>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data.departments)).catch(() => {});
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!form.text.trim()) {
      setError('Please describe your complaint.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('text', form.text);
      fd.append('language', form.language);
      if (form.locality) fd.append('locality', form.locality);
      if (form.address) fd.append('address', form.address);
      if (photo) fd.append('photo', photo);

      const res = await submitComplaint(fd);
      setTicketId(res.ticketId);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card max-w-md w-full text-center shadow-modal">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Submitted!</h2>
          <p className="text-gray-500 mb-6">Your complaint has been successfully registered.</p>
          <div className="bg-warm-50 rounded-xl p-4 mb-6 border border-warm-200">
            <p className="text-xs text-gray-500 mb-1">Your Ticket ID</p>
            <p className="text-2xl font-bold text-primary-700 font-mono">{ticketId}</p>
            <p className="text-xs text-gray-400 mt-1">Save this for future reference</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/track?id=${ticketId}`)}
              className="btn-secondary flex-1"
            >
              Track Status
            </button>
            <button
              onClick={() => { setStep('form'); setForm({ text: '', language: 'en', locality: '', address: '' }); setPhoto(null); setPhotoPreview(null); }}
              className="btn-primary flex-1"
            >
              New Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Submit a Complaint</h1>
        <p className="page-subtitle">Describe your issue in your preferred language.</p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      )}

      <div className="card space-y-6">
        {/* Input Mode Toggle */}
        <div className="flex rounded-xl border border-warm-200 overflow-hidden">
          <button
            onClick={() => setInputMode('type')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
              inputMode === 'type' ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-warm-50'
            }`}
          >
            <Type size={16} />
            Type Complaint
          </button>
          <button
            onClick={() => setInputMode('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
              inputMode === 'voice' ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-warm-50'
            }`}
          >
            <Mic size={16} />
            Voice Complaint
          </button>
        </div>

        {/* Language Selection */}
        <div>
          <label className="form-label">Select Language</label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {LANGUAGES.slice(0, 10).map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setForm({ ...form, language: lang.code })}
                className={`p-2 rounded-lg border text-center transition-all text-xs ${
                  form.language === lang.code
                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                    : 'border-warm-200 hover:border-primary-300 text-gray-600'
                }`}
              >
                <div className="font-bold">{lang.script}</div>
                <div className="text-[10px] mt-0.5">{lang.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Complaint Text */}
        {inputMode === 'type' ? (
          <div>
            <label className="form-label">Complaint Description *</label>
            <textarea
              className="form-input h-36 resize-none"
              placeholder="Describe your complaint in detail… e.g., garbage not collected for 3 days"
              value={form.text}
              onChange={e => setForm({ ...form, text: e.target.value.slice(0, MAX_TEXT) })}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{form.text.length} / {MAX_TEXT}</p>
          </div>
        ) : (
          <div className="border border-warm-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Mic size={28} className="text-primary-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">Voice input coming with AI model integration</p>
            <p className="text-xs text-gray-400">Switch to "Type Complaint" to submit now</p>
          </div>
        )}

        {/* Locality */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Locality / Area</label>
            <input
              className="form-input"
              placeholder="e.g., Sector 12, Andheri"
              value={form.locality}
              onChange={e => setForm({ ...form, locality: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Full Address (optional)</label>
            <input
              className="form-input"
              placeholder="Street, landmark"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="form-label">Attach Photo (Optional)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              photoPreview ? 'border-primary-300 bg-primary-50' : 'border-warm-300 hover:border-primary-400'
            }`}
          >
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Preview" className="max-h-40 rounded-lg mx-auto" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div>
                <Camera size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 5MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {/* AI Notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Sparkles size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">AI Classification</p>
            <p className="text-xs text-amber-700 mt-0.5">
              AI-powered complaint categorization is being integrated. Your complaint will be processed manually in the meantime.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !form.text.trim()}
          className="btn-primary w-full py-3"
        >
          {loading ? (
            <><Spinner size="sm" className="border-white border-t-transparent" /> Submitting…</>
          ) : (
            'Submit Complaint →'
          )}
        </button>
      </div>
    </div>
  );
};

export default SubmitComplaintPage;
