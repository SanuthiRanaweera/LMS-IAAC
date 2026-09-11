import { useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus, ChevronDown, Eye, EyeOff, Check, ShieldCheck, GraduationCap, Briefcase } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_STYLES = {
  superadmin: { badge: 'bg-purple-100 text-purple-700', avatar: 'bg-purple-100 text-purple-700', label: 'Super Admin', icon: ShieldCheck },
  staff: { badge: 'bg-sky-100 text-sky-700', avatar: 'bg-sky-100 text-sky-700', label: 'Staff Admin', icon: Briefcase },
  lecturer: { badge: 'bg-emerald-100 text-emerald-700', avatar: 'bg-emerald-100 text-emerald-700', label: 'Lecturer', icon: GraduationCap },
};

function roleStyle(role) {
  return ROLE_STYLES[role] || { badge: 'bg-slate-100 text-slate-600', avatar: 'bg-slate-100 text-slate-600', label: role, icon: Briefcase };
}

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', branchId: '', intakeId: '', batchId: '', canUpdateResults: false });

  // Cascading dropdowns for lecturer assignment
  const [branches, setBranches] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);

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
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', canUpdateResults: false });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

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
        setForm({ name: '', email: '', password: '', role: 'staff', branchId: '', intakeId: '', batchId: '', canUpdateResults: false });
        setCreateOpen(false);
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
      password: '', // Leave blank for no password change
      canUpdateResults: user.canUpdateResults === true,
    });
    setEditError('');
    setShowEditPassword(false);
  };

  const onEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    const updateData = {
      name: editForm.name,
      email: editForm.email,
      canUpdateResults: editForm.canUpdateResults,
    };

    // Only include password if it's been entered
    if (editForm.password.trim()) {
      updateData.password = editForm.password;
    }

    try {
      await apiPut(`/api/admin/users/${editing}`, updateData);
      setEditing(null);
      setEditForm({ name: '', email: '', password: '', canUpdateResults: false });
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
    setEditForm({ name: '', email: '', password: '', canUpdateResults: false });
    setEditError('');
  };

  const users = Array.isArray(data?.users) ? data.users : [];

  return (
    <div className="space-y-6">
      {/* Create account — collapsible */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <UserPlus size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Create account</div>
              <div className="text-xs text-slate-500">Add a Staff Admin or Lecturer account</div>
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
            <ChevronDown size={14} className={`transition-transform duration-200 ${createOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {createOpen ? (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <p className="text-xs text-slate-500">
              Staff Admin and Lecturer accounts have limited permissions — they can add materials and schedules but
              cannot manage users. Result updates can be granted below.
            </p>

            {createError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}

            <form className="mt-4 space-y-4" onSubmit={onCreate}>
              {/* Role toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600">Account type *</label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {[
                    { value: 'staff', label: 'Staff Admin', desc: 'General admin access', Icon: Briefcase },
                    { value: 'lecturer', label: 'Lecturer', desc: 'Assigned to a batch', Icon: GraduationCap },
                  ].map(({ value, label, desc, Icon }) => {
                    const active = form.role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: value }))}
                        className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          active ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon size={16} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{label}</span>
                          <span className="block text-xs text-slate-500">{desc}</span>
                        </span>
                        {active ? (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Full name *</label>
                  <input
                    value={form.name}
                    onChange={update('name')}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Email *</label>
                  <input
                    value={form.email}
                    onChange={update('email')}
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div className={form.role === 'lecturer' ? '' : 'sm:col-span-2'}>
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {form.role === 'lecturer' ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Branch *</label>
                      <select
                        value={form.branchId}
                        onChange={update('branchId')}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        required
                      >
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                          <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Intake *</label>
                      <select
                        value={form.intakeId}
                        onChange={update('intakeId')}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                        required
                        disabled={!form.branchId}
                      >
                        <option value="">Select intake</option>
                        {intakes.map((i) => (
                          <option key={i.id ?? i.name} value={i.id ?? i.name}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Batch *</label>
                      <select
                        value={form.batchId}
                        onChange={update('batchId')}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                        required
                        disabled={!form.intakeId}
                      >
                        <option value="">Select batch</option>
                        {batches.map((b) => (
                          <option key={b.id ?? b.name} value={b.id ?? b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={form.canUpdateResults}
                  onChange={(e) => setForm((f) => ({ ...f, canUpdateResults: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Allow result updates</span>
                  <span className="block text-xs text-slate-500">Can create, edit, publish, unpublish, and delete results.</span>
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      {/* Users table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Admin users</div>
            <p className="mt-0.5 text-xs text-slate-500">{users.length} account{users.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {deleteError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{deleteError}</div>
        ) : null}
        {loading && !data ? <div className="mt-4 text-sm text-slate-600">Loading…</div> : null}

        {data ? (
          users.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No users yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Results</th>
                    <th className="py-2">Created</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => {
                    const style = roleStyle(u.role);
                    const RoleIcon = style.icon;
                    return (
                      <tr key={u.id} className="text-slate-800">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.avatar}`}>
                              {initials(u.name)}
                            </div>
                            <span className="font-semibold break-words">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          {u.role === 'superadmin' || u.canUpdateResults ? 'Can update' : 'View only'}
                        </td>
                        <td className="py-3 break-all text-slate-600">{u.email}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                            <RoleIcon size={12} />
                            {style.label}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                        <td className="py-3 text-right">
                          {u.role !== 'superadmin' ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(u)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                                title="Edit user"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => onDelete(u.id)}
                                disabled={deleting === u.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>

      {/* Edit User Modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="my-4 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Pencil size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Edit account</h3>
            </div>

            <div className="px-6 py-5">
              {editError ? (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {editError}
                </div>
              ) : null}

              <form onSubmit={onEdit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
                  <input
                    value={editForm.name}
                    onChange={updateEdit('name')}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={editForm.canUpdateResults}
                    onChange={(e) => setEditForm((f) => ({ ...f, canUpdateResults: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Allow result updates</span>
                    <span className="block text-xs text-slate-500">Can create, edit, publish, unpublish, and delete results.</span>
                  </span>
                </label>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Email *</label>
                  <input
                    value={editForm.email}
                    onChange={updateEdit('email')}
                    type="email"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    New password <span className="text-slate-400">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      value={editForm.password}
                      onChange={updateEdit('password')}
                      type={showEditPassword ? 'text' : 'password'}
                      minLength={8}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                      aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {editLoading ? 'Updating…' : 'Update user'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
