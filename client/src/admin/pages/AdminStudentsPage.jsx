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

export default function AdminStudentsPage() {
  const { admin } = useOutletContext();
  const canDelete = String(admin?.role || '') === 'superadmin';

  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [hierarchyError, setHierarchyError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
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

  useEffect(() => {
    if (!form.branchId) {
      setForm((current) => ({ ...current, intakeId: '', batchId: '' }));
      return;
    }

    if (!createIntakes.some((item) => String(item.id) === String(form.intakeId))) {
      setForm((current) => ({ ...current, intakeId: '', batchId: '' }));
      return;
    }

    if (!createBatches.some((item) => String(item.id) === String(form.batchId))) {
      setForm((current) => ({ ...current, batchId: '' }));
    }
  }, [form.branchId, form.intakeId, form.batchId, createIntakes, createBatches]);

  useEffect(() => {
    if (!editingStudent) return;

    if (!editForm.branchId) {
      setEditForm((current) => ({ ...current, intakeId: '', batchId: '' }));
      return;
    }

    if (!editIntakes.some((item) => String(item.id) === String(editForm.intakeId))) {
      setEditForm((current) => ({ ...current, intakeId: '', batchId: '' }));
      return;
    }

    if (!editBatches.some((item) => String(item.id) === String(editForm.batchId))) {
      setEditForm((current) => ({ ...current, batchId: '' }));
    }
  }, [editingStudent, editForm.branchId, editForm.intakeId, editForm.batchId, editIntakes, editBatches]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    apiPost('/api/admin/students', form)
      .then(() => {
        setForm(EMPTY_FORM);
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-slate-900">Create student</div>

        {createError ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {createError.message || 'Failed to create student.'}
          </div>
        ) : null}

        {hierarchyError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {hierarchyError.message || 'Failed to load branch hierarchy.'}
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={onCreate}>
          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Personal Details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Full name *</label>
                <input value={form.fullName} onChange={update('fullName')} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Email *</label>
                <input value={form.email} onChange={update('email')} type="email" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Student ID *</label>
                <input value={form.studentId} onChange={update('studentId')} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Date of Birth</label>
                <input value={form.dob} onChange={update('dob')} type="date" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Gender</label>
                <select value={form.gender} onChange={update('gender')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">NIC / Passport</label>
                <input value={form.nic} onChange={update('nic')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">WhatsApp number</label>
                <input value={form.whatsappNumber} onChange={update('whatsappNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Phone number</label>
                <input value={form.phoneNumber} onChange={update('phoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Address</label>
                <input value={form.address} onChange={update('address')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Educational Background</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">School Name</label>
                <input value={form.school} onChange={update('school')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">O/L Full Result</label>
                <input value={form.olResult} onChange={update('olResult')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">O/L Math Result</label>
                <input value={form.olMath} onChange={update('olMath')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">O/L English Result</label>
                <input value={form.olEnglish} onChange={update('olEnglish')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Academic</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Course</label>
                <input value={form.course} onChange={update('course')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Branch</label>
                <select value={form.branchId} onChange={update('branchId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Intake</label>
                <select value={form.intakeId} onChange={update('intakeId')} disabled={!form.branchId} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
                  <option value="">Select intake</option>
                  {createIntakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>{intake.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Batch</label>
                <select value={form.batchId} onChange={update('batchId')} disabled={!form.intakeId || createBatches.length === 0} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
                  <option value="">Select batch</option>
                  {createBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
                {form.intakeId && createBatches.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">This intake has no batches. Enrollment will be saved at intake level.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-slate-600">Emergency</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Guardian Name</label>
                <input value={form.guardianName} onChange={update('guardianName')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Guardian Phone</label>
                <input value={form.guardianPhoneNumber} onChange={update('guardianPhoneNumber')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Temporary password *</label>
              <input value={form.password} onChange={update('password')} type="password" minLength={8} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>

            <div className="flex items-end">
              <button type="submit" disabled={creating} className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                {creating ? 'Creating…' : 'Create student'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-bold text-slate-900">Students</div>
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

        {deleteError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {deleteError.message || 'Failed to delete student.'}
          </div>
        ) : null}

        {!data ? (
          <div className="mt-4 text-sm text-slate-600">Loading…</div>
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
                {sortedStudents.map((s) => (
                  <tr key={s.id} className="text-slate-800">
                    <td className="py-3 font-semibold break-words">{s.fullName}</td>
                    <td className="py-3 break-all">{s.email}</td>
                    <td className="py-3">{s.studentId}</td>
                    <td className="py-3 break-words">{s.course || '—'}</td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailError(null);
                          setDetailLoading(true);
                          apiGet(`/api/admin/students/${encodeURIComponent(s.id)}`)
                            .then((json) => setDetailStudent(json.student))
                            .catch((err) => setDetailError(err))
                            .finally(() => setDetailLoading(false));
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(s.id)}
                        className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                      >
                        Edit
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(s)}
                          disabled={deletingId === s.id}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <form onSubmit={onSaveEdit} className="relative my-4 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Edit student enrollment</h3>
              <button type="button" className="text-sm text-slate-500" onClick={() => setEditingStudent(null)}>Close</button>
            </div>

            {editError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
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
                <input value={editForm.course} onChange={updateEdit('course')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
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
                <label className="text-xs font-semibold text-slate-600">Intake</label>
                <select value={editForm.intakeId} onChange={updateEdit('intakeId')} disabled={!editForm.branchId} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
                  <option value="">Select intake</option>
                  {editIntakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>{intake.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Batch</label>
                <select value={editForm.batchId} onChange={updateEdit('batchId')} disabled={!editForm.intakeId || editBatches.length === 0} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
                  <option value="">Select batch</option>
                  {editBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
                {editForm.intakeId && editBatches.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">This intake has no batches. Enrollment will be saved at intake level.</p>
                ) : null}
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

            <div className="mt-6 flex justify-end gap-3">
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
