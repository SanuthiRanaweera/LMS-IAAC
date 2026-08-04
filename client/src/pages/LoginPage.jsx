import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost } from '../api/http.js';
import { Plane } from 'lucide-react'; // Example: Add an icon
import L1 from '../image/L1.jpeg';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    apiPost('/api/auth/login', { identifier, password })
      .then((data) => {
        if (data?.lecturer) {
          if (data.mustChangePassword) {
            navigate('/lecturer/change-password', { replace: true });
          } else {
            navigate('/lecturer/dashboard', { replace: true });
          }
        } else {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch((err) => setError(err))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT SIDE: Visual Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#003580] relative items-center justify-center overflow-hidden">
        {/* Abstract Background Elements */}
        <img
          src={L1}
          alt="IAAC"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative z-10 text-center px-12">
          <Plane className="w-16 h-16 text-white mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">IAAC Student Portal</h1>
          <p className="text-sky-100 text-lg">Your journey to the skies starts here. Secure access to your flight training and materials.</p>
        </div>
      </div>

      {/* RIGHT SIDE: The Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Enter your credentials to access your flight deck.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message || 'Invalid credentials. Please try again.'}
            </div>
          )}

          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email or Student ID</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                placeholder="name@iaac.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-sky-600 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#003580] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-all disabled:opacity-70 shadow-lg shadow-blue-900/20"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Flight Deck'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link to="/forgot-password" className="font-semibold text-sky-700 hover:underline">
              Forgot password?
            </Link>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500">Contact admin if you need access.</div>
        </div>
      </div>
    </div>
  );
}