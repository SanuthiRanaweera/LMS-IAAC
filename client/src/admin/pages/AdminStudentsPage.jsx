import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../../api/http.js';

function compareStudentsByStudentId(a, b) {
  const rawA = String(a?.studentId || '').trim().toUpperCase();
  const rawB = String(b?.studentId || '').trim().toUpperCase();

  const numA = Number.parseInt((rawA.match(/(\d+)/) || [])[1] || '', 10);
  const numB = Number.parseInt((rawB.match(/(\d+)/) || [])[1] || '', 10);

  const prefixA = rawA.replace(/\d+/g, '');
  const prefixB = rawB.replace(/\d+/g, '');

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB, undefined, { sensitivity: 'base' });
  }

  const safeA = Number.isFinite(numA) ? numA : Number.POSITIVE_INFINITY;
  const safeB = Number.isFinite(numB) ? numB : Number.POSITIVE_INFINITY;
  if (safeA !== safeB) return safeA - safeB;

  return rawA.localeCompare(rawB, undefined, { sensitivity: 'base' });
}

function buildIntakeOptions(branches, branchId) {
  if (!branchId) return [];
  const branch = branches.find((item) => String(item.id) === String(branchId));
  return Array.isArray(branch?.intakes) ? branch.intakes : [];
}

function buildBatchOptions(branches, branchId, intakeId) {
  if (!branchId || !intakeId) return [];
  const branch = branches.find((item) => String(item.id) === String(branchId));
  const intake = Array.isArray(branch?.intakes)
    ? branch.intakes.find((item) => String(item.id) === String(intakeId))
    : null;
  return Array.isArray(intake?.batches) ? intake.batches : [];
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  studentId: '',
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
  password: '',
  branchId: '',
  intakeId: '',
  batchId: '',
};

const COURSE_OPTIONS = ['Cabin Crew', 'Ground Operations', 'Ticketing & Reservations', 'Air Cargo'];

export default function AdminStudentsPage() {
  const { admin } = useOutletContext();
  const canDelete = String(admin?.role || '') === 'superadmin';

  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Academy "page" navigation: null = overview of academy cards,
  // otherwise 'all' | 'unassigned' | a branch id = which academy's page is open
  const [activeView, setActiveView] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');

  // Which row's action menu is currently open
  const [openActionsFor, setOpenActionsFor] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [hierarchyError, setHierarchyError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM, id: '' });
  const [editError, setEditError] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const createIntakes = useMemo(() => buildIntakeOptions(branches, form.branchId), [branches, form.branchId]);
  const createBatches = useMemo(
    () => buildBatchOptions(branches, form.branchId, form.intakeId),
    [branches, form.branchId, form.intakeId]
  );
  const editIntakes = useMemo(
    () => buildIntakeOptions(branches, editForm.branchId),
    [branches, editForm.branchId]
  );
  const editBatches = useMemo(
    () => buildBatchOptions(branches, editForm.branchId, editForm.intakeId),
    [branches, editForm.branchId, editForm.intakeId]
  );

  const queryString = useMemo(() => {
    const query = q.trim();
    if (!query) return 'limit=100';
    return `q=${encodeURIComponent(query)}&limit=100`;
  }, [q]);

  const sortedStudents = useMemo(() => {
    const list = Array.isArray(data?.students) ? data.students : [];
    return [...list].sort(compareStudentsByStudentId);
  }, [data]);

  // How many students sit in each branch, so tab labels can show counts
  const branchCounts = useMemo(() => {
    const counts = {};
    for (const s of sortedStudents) {
      const key = s.branchId ? String(s.branchId) : 'unassigned';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [sortedStudents]);

  // Bounce back to the overview if the open academy disappears
  useEffect(() => {
    if (!activeView || activeView === 'all' || activeView === 'unassigned') return;
    if (!branches.some((b) => String(b.id) === String(activeView))) {
      setActiveView(null);
    }
  }, [branches, activeView]);

  // Close any open row menu when switching academy pages
  useEffect(() => {
    setOpenActionsFor(null);
  }, [activeView]);

  const activeViewLabel = useMemo(() => {
    if (activeView === 'all') return 'All students';
    if (activeView === 'unassigned') return 'Unassigned';
    const branch = branches.find((b) => String(b.id) === String(activeView));
    return branch?.name || 'Academy';
  }, [activeView, branches]);

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter((s) => {
      if (activeView === 'all') {
        // keep
      } else if (activeView === 'unassigned') {
        if (s.branchId) return false;
      } else if (String(s.branchId || '') !== String(activeView)) {
        return false;
      }

      if (courseFilter !== 'all' && String(s.course || '') !== courseFilter) {
        return false;
      }

      return true;
    });
  }, [sortedStudents, activeView, courseFilter]);

  const load = () => {
    setError(null);
    setDeleteError(null);
    apiGet(`/api/admin/students?${queryString}`)
      .then((json) => setData(json))
      .catch((err) => setError(err));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    apiGet('/api/materials/hierarchy/full')
      .then((json) => setBranches(Array.isArray(json?.branches) ? json.branches : []))
      .catch((err) => setHierarchyError(err));
  }, []);

  // Auto-set intake when branch changes
  useEffect(() => {
    if (!form.branchId) {
      setForm((current) => ({ ...current, intakeId: '', batchId: '' }));
    } else if (createIntakes.length > 0 && !form.intakeId) {
      setForm((current) => ({ ...current, intakeId: createIntakes[0].id, batchId: '' }));
    }
  }, [form.branchId, createIntakes]);

  // Validate intake and batch selections
  useEffect(() => {
    if (!form.branchId) return;

    if (form.intakeId && !createIntakes.some((item) => String(item.id) === String(form.intakeId))) {
      setForm((current) => ({ ...current, intakeId: createIntakes.length > 0 ? createIntakes[0].id : '', batchId: '' }));
    }

    if (form.batchId && !createBatches.some((item) => String(item.id) === String(form.batchId))) {
      setForm((current) => ({ ...current, batchId: '' }));
    }
  }, [form.branchId, form.intakeId, form.batchId, createIntakes, createBatches]);

  useEffect(() => {
    if (!editingStudent) return;

    if (!editForm.branchId) {
      setEditForm((current) => ({ ...current, intakeId: '' }));
      return;
    }

    // Auto-set intake to the first available intake for this branch
    if (editIntakes.length > 0 && !editForm.intakeId) {
      setEditForm((current) => ({ ...current, intakeId: editIntakes[0].id }));
      return;
    }

    if (!editIntakes.some((item) => String(item.id) === String(editForm.intakeId))) {
      setEditForm((current) => ({ ...current, intakeId: editIntakes.length > 0 ? editIntakes[0].id : '' }));
    }
  }, [editingStudent, editForm.branchId, editForm.intakeId, editIntakes]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    apiPost('/api/admin/students', form)
      .then(() => {
        setForm(EMPTY_FORM);
        setCreateOpen(false);
        load();
      })
      .catch((err) => setCreateError(err))
      .finally(() => setCreating(false));
  };

  const startEdit = (studentId) => {
    setEditError(null);
    setSavingEdit(false);
    apiGet(`/api/admin/students/${encodeURIComponent(studentId)}`)
      .then((json) => {
        const student = json?.student;
        if (!student) return;
        setEditingStudent(student);
        setEditForm({
          id: student.id,
          fullName: student.fullName || '',
          email: student.email || '',
          studentId: student.studentId || '',
          nic: student.nic || '',
          course: student.course || '',
          whatsappNumber: student.whatsappNumber || '',
          phoneNumber: student.phoneNumber || '',
          address: student.address || '',
          guardianName: student.guardianName || '',
          guardianPhoneNumber: student.guardianPhoneNumber || '',
          branchId: student.branchId || '',
          intakeId: student.intakeId || '',
          batchId: student.batchId || '',
        });
      })
      .catch((err) => setEditError(err));
  };

  const onSaveEdit = (e) => {
    e.preventDefault();
    if (!editForm.id) return;

    setSavingEdit(true);
    setEditError(null);

    apiPut(`/api/admin/students/${encodeURIComponent(editForm.id)}`, editForm)
      .then(() => {
        setEditingStudent(null);
        load();
      })
      .catch((err) => setEditError(err))
      .finally(() => setSavingEdit(false));
  };

  const onDelete = (student) => {
    if (!canDelete) return;
    if (!student?.id) return;
    setDeleteError(null);

    const ok = window.confirm(
      `Delete student "${student.fullName}" (${student.studentId || 'no id'})? This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(student.id);
    apiDelete(`/api/admin/students/${encodeURIComponent(student.id)}`)
      .then(() => load())
      .catch((err) => setDeleteError(err))
      .finally(() => setDeletingId(null));
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M16.5 5.5v4M14.5 7.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Create student</div>
              <div className="text-xs text-slate-500">Register a new student and set up their enrollment</div>
            </div>
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform duration-200 ${createOpen ? 'rotate-180' : ''}`}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {createOpen ? (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            {createError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {createError.message || 'Failed to create student.'}
              </div>
            ) : null}

            {hierarchyError ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {hierarchyError.message || 'Failed to load branch hierarchy.'}
              </div>
            ) : null}

            <form className="space-y-6" onSubmit={onCreate}>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">1</span>
                  <h4 className="text-sm font-semibold text-slate-800">Personal details</h4>
                </div>
                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Full name *</label>
                    <input value={form.fullName} onChange={update('fullName')} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Email *</label>
                    <input value={form.email} onChange={update('email')} type="email" required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Student ID *</label>
                    <input value={form.studentId} onChange={update('studentId')} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Date of Birth *</label>
                    <input value={form.dob} onChange={update('dob')} type="date" required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Gender *</label>
                    <select value={form.gender} onChange={update('gender')} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">NIC / Passport</label>
                    <input value={form.nic} onChange={update('nic')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">WhatsApp number</label>
                    <input value={form.whatsappNumber} onChange={update('whatsappNumber')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Phone number</label>
                    <input value={form.phoneNumber} onChange={update('phoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Address</label>
                    <input value={form.address} onChange={update('address')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">2</span>
                  <h4 className="text-sm font-semibold text-slate-800">Educational background</h4>
                </div>
                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">School name</label>
                    <input value={form.school} onChange={update('school')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">O/L full result</label>
                    <input value={form.olResult} onChange={update('olResult')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">O/L math result</label>
                    <input value={form.olMath} onChange={update('olMath')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">O/L English result</label>
                    <input value={form.olEnglish} onChange={update('olEnglish')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">3</span>
                  <h4 className="text-sm font-semibold text-slate-800">Academic enrollment</h4>
                </div>
                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Branch</label>
                    <select value={form.branchId} onChange={update('branchId')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Batch</label>
                    <select value={form.intakeId} onChange={update('intakeId')} disabled={!form.branchId} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100">
                      <option value="">Select batch</option>
                      {createIntakes.map((intake) => (
                        <option key={intake.id} value={intake.id}>{intake.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Diploma</label>
                    <select value={form.course} onChange={update('course')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                      <option value="">Select diploma</option>
                      {COURSE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">4</span>
                  <h4 className="text-sm font-semibold text-slate-800">Emergency contact</h4>
                </div>
                <div className="grid gap-4 rounded-xl bg-slate-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Guardian name</label>
                    <input value={form.guardianName} onChange={update('guardianName')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Guardian phone</label>
                    <input value={form.guardianPhoneNumber} onChange={update('guardianPhoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="sm:w-72">
                  <label className="text-xs font-semibold text-slate-600">Temporary password *</label>
                  <div className="relative mt-1">
                    <input
                      value={form.password}
                      onChange={update('password')}
                      type={showPassword ? 'text' : 'password'}
                      minLength={8}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 10s3-6 7.5-6 7.5 6 7.5 6-3 6-7.5 6-7.5-6-7.5-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                          <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 10s3-6 7.5-6c1.64 0 3.02.5 4.15 1.18M17.5 10s-1.15 2.3-3.35 3.94M6.6 4.9C4.2 6.15 2.5 10 2.5 10M4.2 4.2l11.6 11.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8.1 8.2A2.25 2.25 0 0 0 10 13.25c.5 0 .96-.15 1.34-.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">At least 8 characters. The student can change it after logging in.</div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                    {creating ? 'Creating…' : 'Create student'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!activeView ? (
          /* ── Academy overview "page" ───────────────────────────── */
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Students by academy</div>
                <div className="mt-0.5 text-xs text-slate-500">Pick an academy to view its student list</div>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, student ID"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 md:max-w-xs"
              />
            </div>

            {error ? (
              <div className="mt-4 text-sm text-rose-700">Failed to load students.</div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveView('all')}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-sky-300 hover:shadow-sm"
              >
                <div className="text-sm font-bold text-slate-900">All students</div>
                <div className="mt-2 text-3xl font-extrabold text-sky-700">{sortedStudents.length}</div>
                <div className="mt-1 text-xs text-slate-500">Every registered student</div>
              </button>

              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setActiveView(branch.id)}
                  className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-sky-300 hover:shadow-sm"
                >
                  <div className="text-sm font-bold text-slate-900">{branch.name}</div>
                  <div className="mt-2 text-3xl font-extrabold text-sky-700">
                    {branchCounts[String(branch.id)] || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">students enrolled</div>
                </button>
              ))}

              {branchCounts.unassigned ? (
                <button
                  type="button"
                  onClick={() => setActiveView('unassigned')}
                  className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-left transition hover:border-amber-400 hover:shadow-sm"
                >
                  <div className="text-sm font-bold text-slate-900">Unassigned</div>
                  <div className="mt-2 text-3xl font-extrabold text-amber-600">{branchCounts.unassigned}</div>
                  <div className="mt-1 text-xs text-slate-500">No academy set yet</div>
                </button>
              ) : null}
            </div>
          </>
        ) : (
          /* ── Single academy "page" ─────────────────────────────── */
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Academies
                </button>
                <div>
                  <div className="text-sm font-bold text-slate-900">{activeViewLabel}</div>
                  <div className="text-xs text-slate-500">{filteredStudents.length} of {sortedStudents.length} students</div>
                </div>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, student ID"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 md:max-w-xs"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">Diploma</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All diplomas</option>
                {COURSE_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {courseFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setCourseFilter('all')}
                  className="text-xs font-semibold text-sky-700 hover:underline"
                >
                  Clear filter
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 text-sm text-rose-700">Failed to load students.</div>
            ) : null}

            {deleteError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {deleteError.message || 'Failed to delete student.'}
              </div>
            ) : null}

            {!data ? (
              <div className="mt-4 text-sm text-slate-600">Loading…</div>
            ) : filteredStudents.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No students match these filters.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Student ID</th>
                      <th className="py-2">Course</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="text-slate-800">
                        <td className="py-3 font-semibold break-words">{s.fullName}</td>
                        <td className="py-3 break-all">{s.email}</td>
                        <td className="py-3">{s.studentId}</td>
                        <td className="py-3 break-words">{s.course || '—'}</td>
                        <td className="py-3 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenActionsFor((current) => (current === s.id ? null : s.id))}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                              aria-label="Row actions"
                              aria-expanded={openActionsFor === s.id}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="8" cy="3" r="1.4" fill="currentColor" />
                                <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                                <circle cx="8" cy="13" r="1.4" fill="currentColor" />
                              </svg>
                            </button>

                            {openActionsFor === s.id ? (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenActionsFor(null)} />
                                <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionsFor(null);
                                      setDetailError(null);
                                      setDetailLoading(true);
                                      apiGet(`/api/admin/students/${encodeURIComponent(s.id)}`)
                                        .then((json) => setDetailStudent(json.student))
                                        .catch((err) => setDetailError(err))
                                        .finally(() => setDetailLoading(false));
                                    }}
                                    className="block w-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionsFor(null);
                                      startEdit(s.id);
                                    }}
                                    className="block w-full px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
                                  >
                                    Edit
                                  </button>
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionsFor(null);
                                        onDelete(s);
                                      }}
                                      disabled={deletingId === s.id}
                                      className="block w-full border-t border-slate-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                    >
                                      {deletingId === s.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                  ) : null}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Detail modal */}
      {detailStudent || detailLoading || detailError ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailStudent(null)} />
          <div className="relative my-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Student details</h3>
              <button className="text-sm text-slate-500" onClick={() => setDetailStudent(null)}>Close</button>
            </div>

            {detailLoading ? (
              <div className="mt-4 text-sm text-slate-600">Loading…</div>
            ) : detailError ? (
              <div className="mt-4 text-sm text-rose-700">{detailError.message || 'Failed to load details.'}</div>
            ) : detailStudent ? (
              <div className="mt-4 grid gap-2">
                <div><strong>Name:</strong> {detailStudent.fullName}</div>
                <div><strong>Email:</strong> {detailStudent.email}</div>
                <div><strong>Student ID:</strong> {detailStudent.studentId}</div>
                <div><strong>NIC:</strong> {detailStudent.nic || '—'}</div>
                <div><strong>Course:</strong> {detailStudent.course || '—'}</div>
                <div><strong>Phone:</strong> {detailStudent.phoneNumber || '—'}</div>
                <div><strong>WhatsApp:</strong> {detailStudent.whatsappNumber || '—'}</div>
                <div><strong>Address:</strong> {detailStudent.address || '—'}</div>
                <div><strong>Guardian:</strong> {detailStudent.guardianName || '—'} ({detailStudent.guardianPhoneNumber || '—'})</div>
                <div><strong>Branch / Intake / Batch:</strong> {detailStudent.branchId || detailStudent.intakeId || detailStudent.batchId ? `${detailStudent.branchId || '—'} / ${detailStudent.intakeId || '—'} / ${detailStudent.batchId || '—'}` : '—'}</div>
                <div><strong>Created By:</strong> {detailStudent.createdBy}</div>
                <div><strong>Registered At:</strong> {new Date(detailStudent.createdAt).toLocaleString()}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingStudent ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingStudent(null)} />
          <form onSubmit={onSaveEdit} className="relative my-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold">Edit student enrollment</h3>
              <button type="button" className="text-sm text-slate-500" onClick={() => setEditingStudent(null)}>Close</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {editError.message || 'Failed to update student.'}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Full name</label>
                <input value={editForm.fullName} onChange={updateEdit('fullName')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <input value={editForm.email} onChange={updateEdit('email')} type="email" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Student ID</label>
                <input value={editForm.studentId} onChange={updateEdit('studentId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Course</label>
                <select value={editForm.course} onChange={updateEdit('course')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">Select diploma</option>
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Branch</label>
                <select value={editForm.branchId} onChange={updateEdit('branchId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Batch</label>
                <select value={editForm.intakeId} onChange={updateEdit('intakeId')} disabled={!editForm.branchId} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
                  <option value="">Select batch</option>
                  {editIntakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>{intake.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Phone</label>
                <input value={editForm.phoneNumber} onChange={updateEdit('phoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">WhatsApp</label>
                <input value={editForm.whatsappNumber} onChange={updateEdit('whatsappNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">NIC</label>
                <input value={editForm.nic} onChange={updateEdit('nic')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Address</label>
                <input value={editForm.address} onChange={updateEdit('address')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Guardian name</label>
                <input value={editForm.guardianName} onChange={updateEdit('guardianName')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Guardian phone</label>
                <input value={editForm.guardianPhoneNumber} onChange={updateEdit('guardianPhoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
            </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button type="button" onClick={() => setEditingStudent(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={savingEdit} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
