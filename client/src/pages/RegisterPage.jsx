import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, PlaneTakeoff, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../api/http.js';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  studentId: '',
  password: '',
  dob: '',
  gender: '',
  nic: '',
  course: '',
  school: '',
  olResult: '',
  olMath: '',
  olEnglish: '',
  whatsappNumber: '',
  phoneNumber: '',
  address: '',
  guardianName: '',
  guardianPhoneNumber: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const otpRef = useRef(null);

  const linkParams = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return {
      branchId: (params.get('branchId') || '').trim(),
      intakeId: (params.get('intakeId') || '').trim(),
      batchId: (params.get('batchId') || '').trim(),
      inviteToken: (params.get('token') || params.get('inviteToken') || '').trim(),
    };
  }, [location.search]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpSentByEmail, setOtpSentByEmail] = useState(true);

  useEffect(() => {
    if (step === 2) {
      otpRef.current?.focus();
    }
  }, [step]);

  const update = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetToStepOne = () => {
    setStep(1);
    setOtp('');
    setError('');
    setInfo('');
    setOtpSentByEmail(true);
  };

  const onSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!form.fullName.trim()) return setError('Full name is required.');
    if (!form.email.trim()) return setError('Email address is required.');
    if (!form.studentId.trim()) return setError('Student ID is required.');
    if (!form.dob.trim()) return setError('Date of birth is required.');
    if (!form.gender.trim()) return setError('Gender is required.');
    if (!form.password.trim() || form.password.trim().length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (String(form.password || '') !== String(confirmPassword || '')) {
      return setError('Passwords do not match.');
    }

    setSendingOtp(true);
    try {
      const response = await apiPost('/api/auth/send-otp', { email: form.email.trim() });
      const sentByEmail = response?.emailSent !== false;
      setOtpSentByEmail(sentByEmail);
      setStep(2);
      if (sentByEmail) {
        setInfo(`We sent a 6-digit code to ${form.email.trim()}.`);
      } else if (response?.devOtp) {
        setInfo(`Email is unavailable in local mode. Use this OTP: ${response.devOtp}`);
      } else {
        setInfo('Email is unavailable in local mode. Check server logs for the OTP.');
      }
    } catch (err) {
      const raw = String(err?.message || '').toLowerCase();
      if (raw.includes('unable to send verification code')) {
        setError('Unable to send OTP email right now. Please try again in a minute.');
      } else {
        setError(err?.message || 'Failed to send verification code.');
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const onVerifyAndRegister = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!/^[0-9]{6}$/.test(String(otp || '').trim())) {
      return setError('Enter the 6-digit code sent to your email.');
    }

    setVerifyingOtp(true);
    try {
      const payload = {
        ...form,
        otp: String(otp).trim(),
        ...Object.fromEntries(Object.entries(linkParams).filter(([, value]) => value)),
      };

      await apiPost('/api/auth/verify-and-register', payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-200">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        
        {/* LEFT SIDEBAR - Enhanced Glassmorphism & Branding */}
        <aside className="relative hidden overflow-hidden bg-[#001f4d] p-12 text-white lg:flex lg:flex-col lg:justify-between shadow-2xl z-10">
          {/* Cyberpunk/Modern Glow Accents */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/20 via-[#001f4d]/0 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#001f4d] shadow-lg">
                <PlaneTakeoff className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-200/80 mb-0.5">IAAC Aviation</div>
                <div className="text-xl font-bold leading-none tracking-tight">LMS Student Portal</div>
              </div>
            </div>

            <div className="mt-20 max-w-lg space-y-6">
              <div className="inline-block rounded-full bg-sky-500/20 px-3 py-1 border border-sky-400/30">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Secure Registration</p>
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white">
                Verify your email to take flight.
              </h1>
              <p className="text-lg leading-relaxed text-sky-100/80">
                We use a secure two-step authentication flow to protect your academic records and ensure seamless communication throughout your training.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-5 text-sm text-sky-100/90 mt-12">
            <Feature label="Encrypted OTP" icon={<ShieldCheck className="h-5 w-5" />} text="Your 6-digit code expires automatically after 10 minutes." />
            <Feature label="Official Comms" icon={<Mail className="h-5 w-5" />} text="Receive professional verification directly from IAAC admissions." />
            <Feature label="Instant Access" icon={<CheckCircle2 className="h-5 w-5" />} text="Gain immediate access to your dashboard upon verification." />
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT - Form Area */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12 bg-slate-50 overflow-y-auto">
          <div className="w-full max-w-3xl">
            
            {/* Mobile Header */}
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3 text-[#002147]">
                <PlaneTakeoff className="h-7 w-7" />
                <span className="text-lg font-bold tracking-tight">IAAC LMS</span>
              </div>
            </div>

            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 transition-all">
              <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-1">Student Registration</p>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      {step === 1 ? 'Create your account' : 'Enter verification code'}
                    </h2>
                  </div>
                  <div className="inline-flex items-center justify-center rounded-full bg-[#002147]/10 px-4 py-1.5 text-xs font-bold text-[#002147] border border-[#002147]/10">
                    Step {step} of 2
                  </div>
                </div>
              </div>

              <div className="px-8 py-8">
                {error && (
                  <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 flex items-center gap-3 shadow-sm">
                    <ShieldCheck className="h-5 w-5 shrink-0" /> {error}
                  </div>
                )}

                {info && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 flex items-center gap-3 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0" /> {info}
                  </div>
                )}

                {step === 1 ? (
                  <form className="space-y-8" onSubmit={onSendOtp}>
                    
                    {/* Section: Personal Details */}
                    <div>
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Personal Details</h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Full Name">
                          <input value={form.fullName} onChange={update('fullName')} className={inputClass} placeholder="Enter your full name" autoComplete="name" required />
                        </Field>
                        <Field label="Email Address">
                          <input type="email" value={form.email} onChange={update('email')} className={inputClass} placeholder="student@iaac.com" autoComplete="email" required />
                        </Field>
                        <Field label="Date of Birth">
                          <input type="date" value={form.dob} onChange={update('dob')} className={inputClass} required />
                        </Field>
                        <Field label="Gender">
                          <select value={form.gender} onChange={update('gender')} className={inputClass} required>
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </Field>
                        <Field label="NIC / Passport">
                          <input value={form.nic} onChange={update('nic')} className={inputClass} placeholder="Optional" />
                        </Field>
                        <Field label="WhatsApp Number">
                          <input value={form.whatsappNumber} onChange={update('whatsappNumber')} className={inputClass} placeholder="Optional" />
                        </Field>
                        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                            <Field label="Phone Number">
                            <input value={form.phoneNumber} onChange={update('phoneNumber')} className={inputClass} placeholder="Optional" />
                            </Field>
                            <Field label="Address">
                            <input value={form.address} onChange={update('address')} className={inputClass} placeholder="Optional" />
                            </Field>
                        </div>
                      </div>
                    </div>

                    {/* Section: Educational Background */}
                    <div>
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Educational Background</h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="School Name">
                          <input value={form.school} onChange={update('school')} className={inputClass} placeholder="Optional" />
                        </Field>
                        <Field label="O/L Full Result">
                          <input value={form.olResult} onChange={update('olResult')} className={inputClass} placeholder="Optional" />
                        </Field>
                        <Field label="O/L Math Result">
                          <input value={form.olMath} onChange={update('olMath')} className={inputClass} placeholder="Optional" />
                        </Field>
                        <Field label="O/L English Result">
                          <input value={form.olEnglish} onChange={update('olEnglish')} className={inputClass} placeholder="Optional" />
                        </Field>
                      </div>
                    </div>

                    {/* Section: Academic & Emergency */}
                    <div className="grid gap-8 sm:grid-cols-2">
                      <div>
                        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Academic</h3>
                        <div className="space-y-5">
                          <Field label="Student ID">
                            <input value={form.studentId} onChange={update('studentId')} className={inputClass} placeholder="IAAC-0001" autoComplete="off" required />
                          </Field>
                          <Field label="Course Name">
                            <input value={form.course} onChange={update('course')} className={inputClass} placeholder="Optional" />
                          </Field>
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Emergency Contact</h3>
                        <div className="space-y-5">
                          <Field label="Guardian Name">
                            <input value={form.guardianName} onChange={update('guardianName')} className={inputClass} placeholder="Optional" />
                          </Field>
                          <Field label="Guardian Phone">
                            <input value={form.guardianPhoneNumber} onChange={update('guardianPhoneNumber')} className={inputClass} placeholder="Optional" />
                          </Field>
                        </div>
                      </div>
                    </div>

                    {/* Section: Security */}
                    <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                        <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Create Password">
                            <input type="password" value={form.password} onChange={update('password')} className={inputClass} placeholder="8+ characters" autoComplete="new-password" required />
                        </Field>
                        <Field label="Confirm Password">
                            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Re-enter password" autoComplete="new-password" required />
                        </Field>
                        </div>
                    </div>

                    {/* Enrollment Note */}
                    {(linkParams.branchId || linkParams.intakeId || linkParams.batchId || linkParams.inviteToken) && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm text-sky-800 flex gap-3 items-start">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600 mt-0.5" />
                        <div>
                            <p className="font-bold">Enrollment link detected</p>
                            <p className="mt-1 leading-relaxed text-sky-700/80">Your registration will be tied to the provided academic link automatically upon completion.</p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                        type="submit"
                        disabled={sendingOtp}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002147] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#002147]/20 transition-all hover:bg-[#001530] hover:shadow-xl hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-70"
                        >
                        {sendingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                        {sendingOtp ? 'Generating Secure OTP...' : 'Send Verification Code'}
                        </button>
                    </div>
                  </form>
                ) : (
                  
                  /* STEP 2: OTP VERIFICATION */
                  <form className="space-y-8" onSubmit={onVerifyAndRegister}>
                    <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50/50 to-white px-6 py-8 text-center shadow-sm">
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#002147] shadow-md border border-sky-50">
                        <Mail className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Check your email</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-sm mx-auto">
                        {otpSentByEmail ? (
                          <>We sent a secure 6-digit code to <span className="font-bold text-slate-900">{form.email}</span>. Enter it below.</>
                        ) : (
                          <>Enter the 6-digit code below to create your account.</>
                        )}
                      </p>
                    </div>

                    <div className="mx-auto max-w-sm">
                      <label className="mb-2 block text-center text-xs font-bold uppercase tracking-widest text-slate-400">Verification Code</label>
                      <input
                        ref={otpRef}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-5 text-center text-4xl font-black tracking-[0.4em] text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 shadow-inner"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        autoComplete="one-time-code"
                      />
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4">
                      <button
                        type="button"
                        onClick={resetToStepOne}
                        className="inline-flex items-center gap-2 self-center sm:self-start text-sm font-bold text-slate-500 hover:text-[#002147] transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Edit Email Address
                      </button>

                      <button
                        type="submit"
                        disabled={verifyingOtp}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002147] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#002147]/20 transition-all hover:bg-[#001530] hover:shadow-xl hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-70"
                      >
                        {verifyingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                        {verifyingOtp ? 'Authenticating...' : 'Verify & Create Account'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// Improved Field Helper Component
function Field({ label, children }) {
  return (
    <label className="block w-full">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

// Improved Feature Component for Sidebar
function Feature({ icon, label, text }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner">
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-white tracking-wide">{label}</div>
        <div className="mt-1 text-sm leading-relaxed text-sky-100/70">{text}</div>
      </div>
    </div>
  );
}

// Global Input Styling (Upgraded)
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300 shadow-sm';