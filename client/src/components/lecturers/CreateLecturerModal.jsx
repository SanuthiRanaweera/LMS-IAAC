import { useState, useEffect } from 'react';
import { X, UserPlus, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../api/http.js';

export default function CreateLecturerModal({
  isOpen,
  onClose,
  lecturerToEdit = null,
  onSuccess,
}) {
  const isEditing = Boolean(lecturerToEdit);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [branchId, setBranchId] = useState('');
  const [intakeId, setIntakeId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [subject, setSubject] = useState('');
  const [canUpdateResults, setCanUpdateResults] = useState(false);

  // Hierarchy dropdowns
  const [branches, setBranches] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load branches
  useEffect(() => {
    if (isOpen) {
      apiGet('/api/materials/hierarchy')
        .then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Load intakes when branch changes
  useEffect(() => {
    setIntakes([]);
    setBatches([]);
    if (!branchId) return;
    apiGet(`/api/materials/branches/${encodeURIComponent(branchId)}/intakes`)
      .then((d) => setIntakes(Array.isArray(d?.intakes) ? d.intakes : []))
      .catch(() => {});
  }, [branchId]);

  // Load batches when intake changes
  useEffect(() => {
    setBatches([]);
    if (!branchId || !intakeId) return;
    apiGet(
      `/api/materials/branches/${encodeURIComponent(branchId)}/intakes/${encodeURIComponent(intakeId)}/batches`
    )
      .then((d) => setBatches(Array.isArray(d?.batches) ? d.batches : []))
      .catch(() => {});
  }, [branchId, intakeId]);

  // Populate form if editing
  useEffect(() => {
    if (lecturerToEdit) {
      setName(lecturerToEdit.name || '');
      setEmail(lecturerToEdit.email || '');
      setPassword('');
      setConfirmPassword('');
      setBranchId(lecturerToEdit.branchId || '');
      setIntakeId(lecturerToEdit.intakeId || '');
      setBatchId(lecturerToEdit.batchId || '');
      setSubject(lecturerToEdit.subject || '');
      setCanUpdateResults(Boolean(lecturerToEdit.canUpdateResults));
      setError('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setBranchId('');
      setIntakeId('');
      setBatchId('');
      setSubject('');
      setCanUpdateResults(false);
      setError('');
    }
  }, [lecturerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter full name (at least 2 characters).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isEditing) {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (password) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing) {
        const payload = {
          name: cleanName,
          email: cleanEmail,
          branchId,
          intakeId,
          batchId,
          subject,
          canUpdateResults,
        };
        if (password) payload.password = password;

        await apiPut(`/api/admin/lecturers/${lecturerToEdit.id}`, payload);
      } else {
        await apiPost('/api/admin/lecturers', {
          name: cleanName,
          fullName: cleanName,
          email: cleanEmail,
          password,
          confirmPassword,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save lecturer account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white font-bold shadow-2xs">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isEditing ? 'Edit Lecturer & Academic Assignment' : 'Add New Lecturer'}
              </h3>
              <p className="text-xs text-blue-100">
                {isEditing
                  ? 'Update lecturer profile, academic assignments or permissions'
                  : 'Enter lecturer credentials to create an active account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amal Perera"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* 2. Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amal@example.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* 3. Password & 4. Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEditing ? 'New Password (Optional)' : 'Password'}{' '}
                {!isEditing && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isEditing}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditing ? 'Leave blank to keep' : 'Min 8 characters'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Password {!isEditing && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required={!isEditing && Boolean(password)}
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {/* SEPARATE ACADEMIC ASSIGNMENTS: Only displayed when EDITING an existing lecturer */}
          {isEditing && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Academic Assignment (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch</label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id || b.name} value={b.id || b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Intake</label>
                    <select
                      value={intakeId}
                      onChange={(e) => setIntakeId(e.target.value)}
                      disabled={!branchId}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">All Intakes</option>
                      {intakes.map((i) => (
                        <option key={i.id || i.name} value={i.id || i.name}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      disabled={!intakeId}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">All Batches</option>
                      {batches.map((b) => (
                        <option key={b.id || b.name} value={b.id || b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Subject / Module Specialization
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Aviation Safety & Security, Aerodynamics"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Permissions */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canUpdateResults}
                  onChange={(e) => setCanUpdateResults(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#003580] focus:ring-blue-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Allow Result Management Access
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Grants lecturer permission to enter examination marks and generate PDF results reports.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <span>{isEditing ? 'Update Lecturer' : 'Create Lecturer Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
