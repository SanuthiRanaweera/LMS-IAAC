import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../api/http.js';

function readToken(search) {
  try {
    const qs = new globalThis.URLSearchParams(search || '');
    return qs.get('token') || '';
  } catch {
    return '';
  }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => readToken(location.search), [location.search]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token. Please request a new reset link.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/auth/reset-password', { token, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a new password for your account.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="••••••••"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#003580] py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-70"
          >
            {submitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-sky-700 hover:underline">
            Back to login
          </Link>
          <Link to="/forgot-password" className="font-semibold text-sky-700 hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    </div>
  );
}
