import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiPost } from '../api/http.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [emailForReset, setEmailForReset] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [step, setStep] = useState('request');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onRequestCode = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    setDevOtp('');

    try {
      const res = await apiPost('/api/auth/forgot-password', { identifier });
      setEmailForReset(res?.email || identifier);
      setStep('verify');
      setMessage(res?.message || 'A 6-digit verification code was sent to your email.');
      if (res?.devOtp) setDevOtp(String(res.devOtp));
    } catch (err) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    if (!emailForReset) {
      setError('Please request a reset code first.');
      setSubmitting(false);
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email.');
      setSubmitting(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setSubmitting(false);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      await apiPost('/api/auth/reset-password', { email: emailForReset, otp, password });
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
        <h1 className="text-xl font-bold text-slate-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">
          {step === 'request'
            ? 'Enter your email or student ID to receive a one-time reset code.'
            : 'Enter the code from your email, then choose a new password.'}
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
        ) : null}

        {devOtp ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Development code: <span className="font-semibold tracking-[0.25em]">{devOtp}</span>
          </div>
        ) : null}

        {step === 'request' ? (
          <form onSubmit={onRequestCode} className="mt-5 space-y-4">
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
              {submitting ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={onResetPassword} className="mt-5 space-y-4">
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
        )}

        <div className="mt-5 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-sky-700 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
