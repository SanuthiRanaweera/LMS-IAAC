import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../../api/http.js';

export default function AdminStudentsPage() {
  const { admin } = useOutletContext();
  const canDelete = String(admin?.role || '') === 'superadmin';

  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [form, setForm] = useState({
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
  });

  const queryString = useMemo(() => {
    const query = q.trim();
    if (!query) return 'limit=100';
    return `q=${encodeURIComponent(query)}&limit=100`;
  }, [q]);

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

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    apiPost('/api/admin/students', form)
      .then(() => {
        setForm({
          fullName: '',
          email: '',
          studentId: '',
          course: '',
          phoneNumber: '',
          whatsappNumber: '',
          password: '',
        });
        load();
      })
      .catch((err) => setCreateError(err))
      .finally(() => setCreating(false));
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Course</label>
                <input value={form.course} onChange={update('course')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Student ID</label>
                <input value={form.studentId} onChange={update('studentId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required />
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
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Student ID</th>
                  <th className="py-2">Course</th>
                  {canDelete ? <th className="py-2 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.students.map((s) => (
                  <tr key={s.id} className="text-slate-800">
                    <td className="py-3 font-semibold">{s.fullName}</td>
                    <td className="py-3">{s.email}</td>
                    <td className="py-3">{s.studentId}</td>
                    <td className="py-3">{s.course || '—'}</td>
                    {canDelete ? (
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(s)}
                          disabled={deletingId === s.id}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
