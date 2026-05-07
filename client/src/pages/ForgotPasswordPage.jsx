import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/http.js';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [debugResetUrl, setDebugResetUrl] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setDebugResetUrl('');

    try {
      const res = await apiPost('/api/auth/forgot-password', { identifier });
      // Always show generic success.
      setSent(true);
      if (res?.resetUrl) setDebugResetUrl(String(res.resetUrl));
    } catch (err) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">Enter your email or student ID to receive a reset link.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {sent ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            If an account exists for that identifier, a reset link has been sent.
            {debugResetUrl ? (
              <div className="mt-2 break-all text-xs text-emerald-800">
                Debug link: <a className="underline" href={debugResetUrl}>{debugResetUrl}</a>
              </div>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email or Student ID</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="name@iaac.com or STU123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#003580] py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-70"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-sky-700 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
