import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', branchId: '', intakeId: '', batchId: '' });

  // Cascading dropdowns for lecturer assignment
  const [branches, setBranches]   = useState([]);
  const [intakes, setIntakes]     = useState([]);
  const [batches, setBatches]     = useState([]);

  useEffect(() => {
    apiGet('/api/materials/hierarchy')
      .then((d) => setBranches(Array.isArray(d?.branches) ? d.branches : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIntakes([]); setBatches([]);
    setForm((f) => ({ ...f, intakeId: '', batchId: '' }));
    if (!form.branchId) return;
    apiGet(`/api/materials/branches/${encodeURIComponent(form.branchId)}/intakes`)
      .then((d) => setIntakes(Array.isArray(d?.intakes) ? d.intakes : []))
      .catch(() => {});
  }, [form.branchId]); // eslint-disable-line

  useEffect(() => {
    setBatches([]);
    setForm((f) => ({ ...f, batchId: '' }));
    if (!form.branchId || !form.intakeId) return;
    apiGet(`/api/materials/branches/${encodeURIComponent(form.branchId)}/intakes/${encodeURIComponent(form.intakeId)}/batches`)
      .then((d) => setBatches(Array.isArray(d?.batches) ? d.batches : []))
      .catch(() => {});
  }, [form.intakeId]); // eslint-disable-line

  // Edit functionality
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete functionality
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    apiGet('/api/admin/users')
      .then((json) => setData(json))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setError("You don't have permission to view admin users. Please contact your super admin.");
        } else {
          setError(e?.message || 'Failed to load users.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const payload = { ...form };
    if (form.role === 'lecturer') payload.mustChangePassword = true;
    apiPost('/api/admin/users', payload)
      .then(() => {
        setForm({ name: '', email: '', password: '', role: 'staff', branchId: '', intakeId: '', batchId: '' });
        load();
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setCreateError("You don't have permission to create admin accounts. Please contact your super admin.");
        } else {
          setCreateError(e?.message || 'Failed to create account.');
        }
      })
      .finally(() => setCreating(false));
  };

  const startEdit = (user) => {
    setEditing(user.id);
    setEditForm({ 
      name: user.name, 
      email: user.email, 
      password: '' // Leave blank for no password change
    });
    setEditError('');
  };

  const onEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    const updateData = {
      name: editForm.name,
      email: editForm.email
    };

    // Only include password if it's been entered
    if (editForm.password.trim()) {
      updateData.password = editForm.password;
    }

    try {
      await apiPut(`/api/admin/users/${editing}`, updateData);
      setEditing(null);
      setEditForm({ name: '', email: '', password: '' });
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setEditError("You don't have permission to edit admin accounts. Please contact your super admin.");
      } else {
        setEditError(e?.message || 'Failed to update user.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const onDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    setDeleting(userId);
    setDeleteError('');

    try {
      await apiDelete(`/api/admin/users/${userId}`);
      load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setDeleteError("You don't have permission to delete admin accounts. Please contact your super admin.");
      } else {
        setDeleteError(e?.message || 'Failed to delete user.');
      }
    } finally {
      setDeleting(null);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ name: '', email: '', password: '' });
    setEditError('');
  };

  const users = Array.isArray(data?.users) ? data.users : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-slate-900">Create account</div>
        <p className="mt-1 text-sm text-slate-600">
          Create Staff Admin or Lecturer accounts. Both have limited permissions: they can add materials and schedules but cannot edit, delete, or manage users.
        </p>

        {createError ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {createError}
          </div>
        ) : null}

        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <div>
            <label className="text-xs font-semibold text-slate-600">Account type *</label>
            <select
              value={form.role}
              onChange={update('role')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            >
              <option value="staff">Staff Admin</option>
              <option value="lecturer">Lecturer</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Full name *</label>
            <input
              value={form.name}
              onChange={update('name')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Email *</label>
            <input
              value={form.email}
              onChange={update('email')}
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Temporary password *</label>
            <input
              value={form.password}
              onChange={update('password')}
              type="password"
              minLength={8}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          {form.role === 'lecturer' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600">Branch *</label>
                <select value={form.branchId} onChange={update('branchId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required>
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Intake *</label>
                <select value={form.intakeId} onChange={update('intakeId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required disabled={!form.branchId}>
                  <option value="">Select intake</option>
                  {intakes.map((i) => <option key={i.id ?? i.name} value={i.id ?? i.name}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Batch *</label>
                <select value={form.batchId} onChange={update('batchId')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" required disabled={!form.intakeId}>
                  <option value="">Select batch</option>
                  {batches.map((b) => <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-900">Admin users</div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error ? <div className="mt-4 text-sm text-rose-700">{error}</div> : null}
        {deleteError ? <div className="mt-4 text-sm text-rose-700">{deleteError}</div> : null}
        {loading && !data ? <div className="mt-4 text-sm text-slate-600">Loading…</div> : null}

        {data ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="text-slate-800">
                    <td className="py-3 font-semibold break-words">{u.name}</td>
                    <td className="py-3 break-all">{u.email}</td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ 
                        u.role === 'superadmin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'staff' ? 'staff' : u.role === 'lecturer' ? 'lecturer' : u.role}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="py-3 text-right">
                      {u.role !== 'superadmin' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                            title="Edit user"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(u.id)}
                            disabled={deleting === u.id}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      {u.role === 'superadmin' && (
                        <span className="text-xs text-slate-500">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 ? <div className="mt-4 text-sm text-slate-600">No users.</div> : null}
          </div>
        ) : null}
      </section>

      {/* Edit User Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="my-4 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Account</h3>
            
            {editError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={onEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                <input
                  value={editForm.name}
                  onChange={updateEdit('name')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input
                  value={editForm.email}
                  onChange={updateEdit('email')}
                  type="email"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Password <span className="text-slate-400">(leave blank to keep current)</span>
                </label>
                <input
                  value={editForm.password}
                  onChange={updateEdit('password')}
                  type="password"
                  minLength={8}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {editLoading ? 'Updating…' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
