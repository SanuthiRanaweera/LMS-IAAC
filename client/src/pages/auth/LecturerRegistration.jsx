import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Plane,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { apiGet, apiPost } from '../../api/http.js';
import logo from '../../image/logo.png';

export default function LecturerRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  // Invitation validation state
  const [tokenStatus, setTokenStatus] = useState('validating'); // 'validating' | 'valid' | 'invalid'
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [registeredLecturerId, setRegisteredLecturerId] = useState('');

  // Validate token on mount or token change
  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setTokenError(
        'A valid registration invitation link from the Super Admin is required to register as a lecturer.'
      );
      return;
    }

    let isMounted = true;
    setTokenStatus('validating');
    setTokenError('');

    apiGet(`/api/lecturers/invitations/validate?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (!isMounted) return;
        if (data?.valid) {
          setTokenStatus('valid');
          setTokenInfo(data);
        } else {
          setTokenStatus('invalid');
          setTokenError(data?.message || 'This registration link is invalid or no longer available.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setTokenStatus('invalid');
        setTokenError(
          err?.message ||
            'This registration link has expired, reached its usage limit, or is no longer valid. Please contact the Super Admin.'
        );
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setFormError('Your password does not meet the minimum security requirements (at least 8 characters).');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('/api/lecturers/register', {
        token,
        fullName: cleanName,
        email: cleanEmail,
        password,
        confirmPassword,
      });

      if (res?.lecturer?.lecturerId) {
        setRegisteredLecturerId(res.lecturer.lecturerId);
      }
      setRegisteredSuccess(true);
    } catch (err) {
      setFormError(err?.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="IAAC Logo" className="h-10 w-auto object-contain" />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-xs font-extrabold tracking-wider text-slate-800 uppercase block">
                International Airline & Aviation College
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Academic Management Portal
              </span>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003580] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition"
          >
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-6 text-white text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/10 text-white mb-3 shadow-inner">
                <Plane className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Lecturer Registration
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-sm mx-auto">
                Create your lecturer account to access the IAAC Learning Management System.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* STATE 1: REGISTRATION SUCCESS */}
              {registeredSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Registration Request Submitted!
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Your lecturer account for <strong>{fullName}</strong> ({email}) has been created with status{' '}
                      <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                        Pending Approval
                      </span>.
                    </p>
                    {registeredLecturerId && (
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        Assigned Lecturer ID:{' '}
                        <span className="font-mono font-bold text-[#003580] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                          {registeredLecturerId}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-left text-xs text-blue-900 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-blue-950">
                      <ShieldCheck className="h-4 w-4 text-blue-700" />
                      <span>Next Steps</span>
                    </div>
                    <p className="text-slate-600">
                      1. The Super Admin has been notified of your registration.
                    </p>
                    <p className="text-slate-600">
                      2. Once approved, your account will be activated and you can sign in with your email and password.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#003580] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-900"
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : tokenStatus === 'validating' ? (
                /* STATE 2: VALIDATING TOKEN */
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#003580] border-t-transparent"></div>
                  <p className="text-xs font-medium text-slate-600">
                    Verifying lecturer invitation link security...
                  </p>
                </div>
              ) : tokenStatus === 'invalid' ? (
                /* STATE 3: INVALID / EXPIRED / MISSING TOKEN */
                <div className="py-4 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-base font-bold text-slate-900">
                      Registration Link Unavailable
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                      {tokenError || 'This registration link is invalid, expired, or has reached its usage limit.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Security Notice</span>
                    </div>
                    <p>
                      Lecturer registration requires a valid invitation link generated by the IAAC Super Admin. If you are an authorized instructor, please request a new invitation link from your department administrator.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Link
                      to="/login"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <span>Go to Sign In</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* STATE 4: VALID TOKEN - REGISTRATION FORM */
                <div>
                  {tokenInfo?.linkName && (
                    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block">{tokenInfo.linkName}</span>
                          <span className="text-[11px] text-emerald-700">Authorized Registration Invitation</span>
                        </div>
                      </div>
                      {tokenInfo.remainingUses !== undefined && (
                        <span className="rounded-md bg-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {tokenInfo.remainingUses} use{tokenInfo.remainingUses === 1 ? '' : 's'} remaining
                        </span>
                      )}
                    </div>
                  )}

                  {formError && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2.5 text-xs font-semibold text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-9.5 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        />
                        <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-9.5 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        />
                        <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password (min 8 characters)"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-9.5 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        />
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-9.5 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        />
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 text-white font-bold py-3 px-4 text-sm shadow-md transition disabled:opacity-60 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Creating Lecturer Account...</span>
                          </>
                        ) : (
                          <>
                            <span>Create Lecturer Account</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Login Link */}
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <span className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-[#003580] hover:underline">
                    Sign In
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} International Airline & Aviation College (IAAC). All rights reserved.
      </footer>
    </div>
  );
}
