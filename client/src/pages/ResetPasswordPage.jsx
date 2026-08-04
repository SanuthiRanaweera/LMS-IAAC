import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      const payload = token
        ? { token, password }
        : { email, otp, password };
      await apiPost('/api/auth/reset-password', payload);
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
        <p className="mt-1 text-sm text-slate-600">
          {token ? 'Choose a new password for your account.' : 'Enter the code sent to your email and choose a new password.'}
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {!token ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
                  placeholder="name@iaac.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">6-digit code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
                  placeholder="123456"
                  required
                />
              </div>
            </>
          ) : null}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
            <div className="relative">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showConfirm ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
            Request new code
          </Link>
        </div>
      </div>
    </div>
  );
}
