import { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { apiPost } from '../../api/http.js';

export default function ResetPasswordModal({ isOpen, onClose, lecturer, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !lecturer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiPost(`/api/admin/lecturers/${lecturer.id}/reset-password`, {
        newPassword,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white font-bold">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Reset Lecturer Password
              </h3>
              <p className="text-xs text-blue-100 truncate max-w-[240px]">
                {lecturer.name} ({lecturer.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            The lecturer will be required to change this temporary password upon next sign in.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Resetting...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
