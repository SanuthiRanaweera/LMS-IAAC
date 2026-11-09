import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../../api/http.js';
import { ShieldCheck, Lock, Mail } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    apiPost('/api/admin/auth/login', { email, password })
      .then((data) => {
        const role = data?.admin?.role || data?.role;
        if (role === 'lecturer') {
          navigate('/lecturer/dashboard', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      })
      .catch((err) => setError(err))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* LEFT: Branding/Security Panel */}
      <div className="hidden lg:flex w-1/3 bg-slate-900 p-12 flex-col justify-center text-white">
        <ShieldCheck className="h-16 w-16 text-sky-400 mb-8" />
        <h1 className="text-4xl font-bold mb-4">Admin Portal</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Authorized personnel only. Manage student records, lecture schedules, and global LMS settings.
        </p>
      </div>

      {/* RIGHT: Login Form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500">Sign in to the IAAC Management System</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message || 'Authentication failed.'}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Admin Email</label>
              <div className="absolute left-3 top-[38px] text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                placeholder="admin@iaac.com"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
              <div className="absolute left-3 top-[38px] text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70"
            >
              {submitting ? 'Verifying...' : 'Access System'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}