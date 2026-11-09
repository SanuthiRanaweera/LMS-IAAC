import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '../../api/http.js';
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import logoImg from '../../image/logo.png';
import aviationImg from '../../image/L1.jpeg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_EMAIL_KEY = 'iaac_admin_remembered_email';

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  /* =======================================================
     LOAD REMEMBERED EMAIL ON MOUNT
  ======================================================= */
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Graceful fallback if localStorage is unavailable
    }
  }, []);

  /* =======================================================
     FIELD VALIDATION
  ======================================================= */
  const validateEmailField = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return 'Please enter your email address.';
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePasswordField = (value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return 'Please enter your password.';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (errorMessage) setErrorMessage('');
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmailField(val) }));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (errorMessage) setErrorMessage('');
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePasswordField(val) }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmailField(email) }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePasswordField(password) }));
    }
  };

  /* =======================================================
     FORM SUBMISSION & AUTHENTICATION
  ======================================================= */
  const onSubmit = async (e) => {
    e.preventDefault();

    const emailErr = validateEmailField(email);
    const passErr = validatePasswordField(password);

    setTouched({ email: true, password: true });
    setFieldErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const trimmedEmail = email.trim();

    try {
      const data = await apiPost('/api/admin/auth/login', {
        email: trimmedEmail,
        password,
      });

      // Handle remember me persistence
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // Ignore localStorage restrictions
      }

      // Role-based navigation based on authenticated backend payload
      const role = data?.admin?.role || data?.role;
      if (role === 'lecturer') {
        navigate('/lecturer/dashboard', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      // Provide professional, secure error messaging
      if (!err || typeof err !== 'object') {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } else if (
        err.status === 0 ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch')
      ) {
        setErrorMessage('Unable to connect to the server. Please check your internet connection.');
      } else if (err.status === 401) {
        setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
      } else if (err.status === 403) {
        setErrorMessage(
          err.message || 'Your account is not currently authorized to access this portal.'
        );
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-[#F8FAFC]">
      {/* =======================================================
          LEFT PANEL: Institutional Branding & Aviation Visuals (Desktop)
      ======================================================= */}
      <section
        className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden bg-[#101B35] flex-col justify-between p-10 xl:p-14 text-white select-none"
        aria-label="Institutional Branding"
      >
        {/* Aviation Background Image */}
        <img
          src={aviationImg}
          alt="IAAC Aviation Environment"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-30 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Deep Navy Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#101B35]/95 via-[#101B35]/85 to-[#0F172A]/98 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Official College Logo & Identification */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20 border border-white/20">
            <img
              src={logoImg}
              alt="IAAC Official College Crest"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-extrabold tracking-tight text-white leading-tight">
              IAAC Portal
            </span>
            <span className="block text-[11px] font-semibold text-blue-200/80 tracking-wider uppercase">
              International Airline & Aviation College
            </span>
          </div>
        </div>

        {/* Center: Hero Heading, Subheading & Academic Description */}
        <div className="relative z-10 my-auto py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-200 mb-6 backdrop-blur-xs">
            <ShieldCheck size={14} className="text-blue-400 shrink-0" aria-hidden="true" />
            <span>Institutional Management Gateway</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            IAAC Management Portal
          </h1>

          <p className="mt-2 text-base font-semibold text-blue-200/90">
            International Airline & Aviation College
          </p>

          <p className="mt-4 text-sm font-semibold italic text-sky-300">
            "Connecting Education, Excellence & Aviation."
          </p>

          <p className="mt-3 text-sm text-slate-300/90 leading-relaxed max-w-md font-normal">
            A unified platform for managing academic operations, student records, learning resources, and institutional administration.
          </p>

          {/* Institutional Highlights */}
          <div className="mt-8 space-y-3 pt-4 border-t border-white/10 max-w-sm">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" aria-hidden="true" />
              <span>Role-based Academic Administration</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" aria-hidden="true" />
              <span>Secure Multi-Portal Authentication</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" aria-hidden="true" />
              <span>Comprehensive Student & Lecturer Management</span>
            </div>
          </div>
        </div>

        {/* Bottom: College System Footer */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>IAAC Learning Management System</span>
            <span className="flex items-center gap-1.5 text-blue-300/70">
              <ShieldCheck size={13} className="text-blue-400" aria-hidden="true" />
              Secure System
            </span>
          </div>
        </div>
      </section>

      {/* =======================================================
          RIGHT PANEL: Clean Institutional Login Form
      ======================================================= */}
      <main className="w-full lg:w-[55%] xl:w-[58%] flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        {/* Mobile Header (displayed on screens < lg) */}
        <div className="w-full max-w-[460px] lg:hidden mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 mb-3">
            <img
              src={logoImg}
              alt="IAAC Official College Crest"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            IAAC Management Portal
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            International Airline & Aviation College
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[460px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-7 sm:p-10 transition-all">
          {/* Card Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to access your IAAC Management Portal.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs sm:text-sm text-rose-800 flex items-start gap-3 shadow-2xs"
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-rose-900 leading-tight">Unable to Sign In</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {/* Email Address Input */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail size={18} strokeWidth={2} aria-hidden="true" />
                </div>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="Enter your registered email"
                  aria-invalid={Boolean(touched.email && fieldErrors.email)}
                  aria-describedby={touched.email && fieldErrors.email ? 'admin-email-error' : undefined}
                  className={`w-full min-h-[48px] rounded-xl border bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none focus:bg-white ${
                    touched.email && fieldErrors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-slate-300 hover:border-slate-400 focus:border-[#003580] focus:ring-4 focus:ring-[#003580]/10'
                  }`}
                />
              </div>
              {touched.email && fieldErrors.email && (
                <p id="admin-email-error" className="mt-1.5 text-xs font-semibold text-rose-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <LockKeyhole size={18} strokeWidth={2} aria-hidden="true" />
                </div>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="Enter your password"
                  aria-invalid={Boolean(touched.password && fieldErrors.password)}
                  aria-describedby={touched.password && fieldErrors.password ? 'admin-password-error' : undefined}
                  className={`w-full min-h-[48px] rounded-xl border bg-slate-50/60 py-3 pl-11 pr-11 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none focus:bg-white ${
                    touched.password && fieldErrors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-slate-300 hover:border-slate-400 focus:border-[#003580] focus:ring-4 focus:ring-[#003580]/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 focus:outline-none focus:text-slate-900 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Eye size={18} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p id="admin-password-error" className="mt-1.5 text-xs font-semibold text-rose-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#003580] focus:ring-[#003580] cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  Remember Me
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#003580] hover:text-[#002860] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Primary Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#003580] hover:bg-[#002860] active:scale-[0.99] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={18} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Student Portal Redirection Note */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Are you an enrolled student? </span>
            <Link
              to="/login"
              className="font-bold text-[#003580] hover:text-[#002860] hover:underline ml-1"
            >
              Sign in to Student Portal
            </Link>
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} International Airline & Aviation College. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
