import React, { useEffect, useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { Department } from '../../types';
import { Spinner, Alert, Modal } from '../../components/ui';

const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const adminHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetch = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.departments);
    } catch { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setEditId(d.id);
    setForm({ name: d.name, code: d.code, description: d.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, form, { headers: adminHeader() });
        setMessage('Department updated.');
      } else {
        await api.post('/departments', form, { headers: adminHeader() });
        setMessage('Department created.');
      }
      setShowModal(false);
      fetch();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage departments for complaint assignment.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={14} /> Add Department
        </button>
      </div>

      {message && <div className="mb-4"><Alert type="success" message={message} onClose={() => setMessage('')} /></div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d.id} className="card-hover">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{d.name}</h3>
                <p className="text-xs text-primary-600 font-mono mt-0.5">{d.code}</p>
              </div>
              <button onClick={() => openEdit(d)} className="btn-ghost p-1.5">
                <Edit2 size={14} />
              </button>
            </div>
            <p className="text-sm text-gray-500">{d.description || 'No description'}</p>
            <div className="mt-3 pt-3 border-t border-warm-200 flex items-center justify-between">
              <span className={`text-xs font-semibold ${d.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {d.isActive ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Department' : 'Add Department'}>
        <div className="space-y-4">
          <div>
            <label className="form-label">Department Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Code *</label>
            <input
              className="form-input"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!!editId}
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input h-20 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1" disabled={saving || !form.name || !form.code}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDepartmentsPage;
