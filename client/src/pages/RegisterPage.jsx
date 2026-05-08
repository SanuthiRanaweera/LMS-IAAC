import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../api/http.js';
import { PlaneTakeoff } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const linkParams = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const branchId = (params.get('branchId') || '').trim();
    const intakeId = (params.get('intakeId') || '').trim();
    const inviteToken = (params.get('token') || params.get('inviteToken') || '').trim();
    return { branchId, intakeId, inviteToken };
  }, [location.search]);

  const isLegacyInviteLink = Boolean(linkParams.intakeId && linkParams.inviteToken);
  const isBranchIntakeLink = Boolean(linkParams.branchId && linkParams.intakeId && !linkParams.inviteToken);

  const [form, setForm] = useState({
    fullName: '', email: '', nic: '', course: '', studentId: '',
    whatsappNumber: '', phoneNumber: '', address: '',
    guardianName: '', guardianPhoneNumber: '', password: '',
    school: '', olResult: '', olMath: '', olEnglish: '', dob: '', gender: ''
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();

    if (String(form.password || '') !== String(confirmPassword || '')) {
      setError({ message: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    setError(null);
    apiPost('/api/auth/register', {
      ...form,
      ...(isLegacyInviteLink
        ? { intakeId: linkParams.intakeId, inviteToken: linkParams.inviteToken }
        : {}),
      ...(isBranchIntakeLink
        ? {
            branchId: linkParams.branchId,
            intakeId: linkParams.intakeId,
          }
        : {}),
    })
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err) => setError(err))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Branding */}
      <div className="hidden lg:flex w-1/3 bg-[#003580] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-white">
            <PlaneTakeoff className="h-8 w-8" />
            <span className="text-2xl font-bold">IAAC</span>
          </div>
          <h1 className="text-white text-3xl font-bold mt-10 leading-tight">Join the Academy</h1>
          <p className="text-sky-200 mt-4 text-sm">Providing the future of aviation with elite training and professional development.</p>
        </div>
      </div>

      {/* Registration Form Area */}
      <div className="w-full lg:w-2/3 p-8 lg:p-16 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          <form onSubmit={onSubmit} className="space-y-8 mt-6">

            {isBranchIntakeLink && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">
                  Intake Registration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Branch" value={linkParams.branchId} required readOnly />
                  <Input label="Intake" value={linkParams.intakeId} required readOnly />
                </div>
              </div>
            )}
            
            {/* PERSONAL INFO */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" value={form.fullName} onChange={update('fullName')} required />
                <Input label="Email Address" type="email" value={form.email} onChange={update('email')} required />
                <Input label="Date of Birth" type="date" value={form.dob} onChange={update('dob')} required />
                <Select label="Gender" value={form.gender} onChange={update('gender')} options={['Male', 'Female', 'Other']} required />
                <Input label="NIC / Passport" value={form.nic} onChange={update('nic')} />
                <Input label="WhatsApp Number" value={form.whatsappNumber} onChange={update('whatsappNumber')} />
                <Input label="Phone Number" value={form.phoneNumber} onChange={update('phoneNumber')} />
                <Input label="Address" value={form.address} onChange={update('address')} />
              </div>
            </div>

            {/* EDUCATIONAL BACKGROUND - NEW */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Educational Background</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="School Name" value={form.school} onChange={update('school')} />
                <Input label="O/L Full Result" value={form.olResult} onChange={update('olResult')} />
                <Input label="O/L Math Result" value={form.olMath} onChange={update('olMath')} />
                <Input label="O/L English Result" value={form.olEnglish} onChange={update('olEnglish')} />
              </div>
            </div>

            {/* ACADEMIC & EMERGENCY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Academic</h3>
                <div className="space-y-4">
                    <Input label="Student ID" value={form.studentId} onChange={update('studentId')} required />
                    <Input label="Course Name" value={form.course} onChange={update('course')} />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Emergency</h3>
                <div className="space-y-4">
                    <Input label="Guardian Name" value={form.guardianName} onChange={update('guardianName')} />
                    <Input label="Guardian Phone" value={form.guardianPhoneNumber} onChange={update('guardianPhoneNumber')} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Create Password" type="password" value={form.password} onChange={update('password')} required />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error?.message ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error.message}
              </div>
            ) : null}

            <button type="submit" disabled={submitting} className="w-full bg-[#003580] text-white py-4 rounded-xl font-bold hover:bg-blue-900 transition-all">
              {submitting ? 'Processing...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, required, readOnly }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange || (() => {})}
        required={required}
        readOnly={readOnly}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <select value={value} onChange={onChange} required={required} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none bg-white">
        <option value="">Select...</option>
        {options.map((opt) => {
          const normalized =
            typeof opt === 'string'
              ? { label: opt, value: opt.toLowerCase() }
              : { label: opt?.label ?? String(opt?.value ?? ''), value: String(opt?.value ?? '') };
          return (
            <option key={normalized.value} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}