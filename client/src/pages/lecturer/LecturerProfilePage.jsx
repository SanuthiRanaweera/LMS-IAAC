import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CircleUserRound,
  Mail,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  LoaderCircle,
  Lock,
} from 'lucide-react';
import { apiPut } from '../../api/http.js';

export default function LecturerProfilePage() {
  const { lecturer, setLecturer } = useOutletContext() || {};

  const [name, setName] = useState(lecturer?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to set a new password.');
        return;
      }
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match. Please verify.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {};
      if (name.trim() && name.trim() !== lecturer?.name) {
        payload.name = name.trim();
      }
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.');
        setLoading(false);
        return;
      }

      const res = await apiPut('/api/lecturers/me/profile', payload);
      setSuccess('Your profile details and password have been updated successfully.');
      if (res?.lecturer && setLecturer) {
        setLecturer((prev) => ({ ...prev, ...res.lecturer }));
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#003580]">
            <CircleUserRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <span>My Profile & Account Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View your academic assignments, personal credentials, and manage your password.
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#003580]" />
          <span>Academic Assignment Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Full Name
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">{lecturer?.name || '—'}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Registered Email
            </span>
            <p className="text-base font-mono text-slate-800 mt-1">{lecturer?.email || '—'}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Subject / Module
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">
              {lecturer?.subject || 'All General Modules'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Batch
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">
              {lecturer?.batchId ? `Batch ${lecturer.batchId}` : 'All Batches'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Branch Campus
            </span>
            <p className="text-base font-bold text-slate-900 mt-1">
              {lecturer?.branchId || 'Rathmalana Campus'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Account Status
            </span>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-0.5 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Active Lecturer
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password & Profile Details Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#003580]" />
          <span>Change Password & Details</span>
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          To update your password, enter your current password followed by your new password.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to set new password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password (Min 8 Characters)
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#003580] hover:bg-blue-900 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Save Profile & Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
