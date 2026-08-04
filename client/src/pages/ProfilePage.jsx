import { useEffect, useState } from 'react';
import { GraduationCap, Mail, MapPin, Phone, User } from 'lucide-react';
import { apiGet, apiPatch } from '../api/http.js';

export default function ProfileSettings() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ email: '', phoneNumber: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const toUserMessage = (err, fallback) => {
    if (err?.status === 401) return 'Your session expired. Please log in again.';
    return err?.message || fallback;
  };

  // Fetch real data from backend
  useEffect(() => {
    setErrMsg('');
    setStatus('');
    apiGet('/api/auth/me')
      .then((json) => {
        setData(json);
        setForm({
          email: String(json?.email || ''),
          phoneNumber: String(json?.phoneNumber || ''),
        });
      })
      .catch((err) => {
        setErrMsg(toUserMessage(err, 'Failed to fetch profile.'));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErrMsg('');
    setStatus('');
    try {
      const updated = await apiPatch('/api/auth/me', form);
      setData(updated);
      setStatus('Saved.');
    } catch (err) {
      setErrMsg(toUserMessage(err, 'Update failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwSaving(true);
    setErrMsg('');
    setStatus('');
    try {
      await apiPatch('/api/auth/change-password', pwForm);
      setPwForm({ oldPassword: '', newPassword: '' });
      setStatus('Password updated.');
    } catch (err) {
      setErrMsg(toUserMessage(err, 'Password update failed.'));
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Loading your profile...</div>;
  if (!data) return <div className="p-10 text-center text-red-400">{errMsg || 'Error loading profile data.'}</div>;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your official IAAC account details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
             {/* Using API provided avatar or fallback */}
             <div className="h-28 w-28 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50 overflow-hidden">
                {data.avatar ? <img src={data.avatar} alt="Profile" /> : <User size={48} className="text-slate-400"/>}
             </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900">{data.name}</h2>
          <p className="text-sm text-sky-700 font-medium bg-sky-50 px-3 py-1 rounded-full mt-2">{data.studentId}</p>
          
          <div className="w-full mt-6 space-y-3 border-t pt-6 text-left">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <GraduationCap size={18} /> {data.course || '—'}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin size={18} /> {data.address || '—'}
            </div>
          </div>
        </div>

        {/* Right Column: Update Forms */}
        <div className="lg:col-span-2 space-y-6">
          {errMsg ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errMsg}</div>
          ) : null}
          {status ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{status}</div>
          ) : null}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-900">Personal Information</div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  icon={<Mail size={16} />}
                />
                <Input
                  label="Phone Number"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  icon={<Phone size={16} />}
                />
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-900">Security</div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Old Password"
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.oldPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={pwSaving}
                  className="px-6 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, icon, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-3 text-slate-400">{icon}</div>}
        <input 
          type={type} 
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-all ${icon ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  );
}