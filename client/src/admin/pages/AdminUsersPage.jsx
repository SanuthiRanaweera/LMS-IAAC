import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Check,
  KeyRound,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_STYLES = {
  superadmin: {
    badge: 'bg-purple-100 text-purple-800 border border-purple-200',
    avatar: 'bg-purple-700 text-white',
    label: 'Super Admin',
    icon: ShieldCheck,
  },
  staff: {
    badge: 'bg-sky-100 text-sky-800 border border-sky-200',
    avatar: 'bg-[#003580] text-white',
    label: 'Staff Admin',
    icon: Briefcase,
  },
};

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formCanUpdateResults, setFormCanUpdateResults] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    setError('');
    apiGet('/api/admin/users')
      .then((json) => setData(json))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setError("You don't have permission to view admin users. Please contact your Super Admin.");
        } else {
          setError(e?.message || 'Failed to load users.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const rawUsers = Array.isArray(data?.users) ? data.users : [];

  // Filter out lecturers from this table since they are managed in the dedicated Lecturers hub
  const adminUsers = useMemo(() => {
    return rawUsers.filter((u) => u.role === 'superadmin' || u.role === 'staff');
  }, [rawUsers]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: adminUsers.length,
      superadmin: adminUsers.filter((u) => u.role === 'superadmin').length,
      staff: adminUsers.filter((u) => u.role === 'staff').length,
      resultsEnabled: adminUsers.filter((u) => u.role === 'superadmin' || u.canUpdateResults).length,
    };
  }, [adminUsers]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return adminUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adminUsers, roleFilter, search]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormCanUpdateResults(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormCanUpdateResults(Boolean(user.canUpdateResults));
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalError('');
    setModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const cleanName = formName.trim();
    if (!cleanName || cleanName.length < 2) {
      setModalError('Please enter full name (at least 2 characters).');
      return;
    }

    const cleanEmail = formEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setModalError('Please enter a valid email address.');
      return;
    }

    if (!editingUser) {
      if (!formPassword || formPassword.length < 8) {
        setModalError('Password must be at least 8 characters.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setModalError('Passwords do not match.');
        return;
      }
    } else if (formPassword) {
      if (formPassword.length < 8) {
        setModalError('Password must be at least 8 characters.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setModalError('Passwords do not match.');
        return;
      }
    }

    setModalLoading(true);
    try {
      if (editingUser) {
        const payload = {
          name: cleanName,
          email: cleanEmail,
          canUpdateResults: formCanUpdateResults,
        };
        if (formPassword) payload.password = formPassword;

        await apiPut(`/api/admin/users/${editingUser.id}`, payload);
        setSuccessMessage(`Account for "${cleanName}" updated successfully.`);
      } else {
        await apiPost('/api/admin/users', {
          name: cleanName,
          email: cleanEmail,
          password: formPassword,
          role: 'staff',
          canUpdateResults: formCanUpdateResults,
        });
        setSuccessMessage(`Staff Admin account "${cleanName}" created successfully.`);
      }

      setModalOpen(false);
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setModalError(err?.message || 'Failed to save account.');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete the account for "${user.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(user.id);
    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      setSuccessMessage(`Account for "${user.name}" deleted successfully.`);
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err?.message || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-[#003580]" />
            <span>Staff & Admin Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Create and manage Super Admin and Staff Admin accounts, credentials, and examination results permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Admin</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Staff & Admins
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
            Super Admins
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-900">{stats.superadmin}</span>
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Staff Admins
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-sky-900">{stats.staff}</span>
            <Briefcase className="h-5 w-5 text-sky-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Results Permission
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">{stats.resultsEnabled}</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search staff or admin by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9.5 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="staff">Staff Admin</option>
          </select>

          <button
            type="button"
            onClick={loadUsers}
            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="p-4 text-xs font-semibold text-rose-600 bg-rose-50 border-b border-rose-100">
            {error}
          </div>
        )}

        {loading && adminUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#003580] border-t-transparent mb-2"></div>
            <div>Loading accounts from MongoDB...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No admin or staff accounts found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4 text-center">Account Role</th>
                  <th className="py-3 px-4 text-center">Results Access</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const style = ROLE_STYLES[user.role] || ROLE_STYLES.staff;
                  const RoleIcon = style.icon;
                  const isSuper = user.role === 'superadmin';
                  const hasResults = isSuper || user.canUpdateResults;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition text-slate-800">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs shadow-2xs ${style.avatar}`}>
                            {initials(user.name)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {user.name}
                            </span>
                            {isSuper && (
                              <span className="text-[10px] font-semibold text-purple-700 block">
                                Full System Privileges
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
                          <RoleIcon className="h-3 w-3" />
                          <span>{style.label}</span>
                        </span>
                      </td>

                      {/* Results Permission */}
                      <td className="py-3 px-4 text-center">
                        {hasResults ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Can Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                            View Only
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isSuper ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition cursor-pointer"
                                title="Edit staff account"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deletingId === user.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition cursor-pointer disabled:opacity-50"
                                title="Delete account"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                              Protected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white font-bold shadow-2xs">
                  {editingUser ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {editingUser ? 'Edit Staff Account' : 'Add Staff Admin'}
                  </h3>
                  <p className="text-xs text-blue-100">
                    {editingUser
                      ? 'Update credentials or result permissions'
                      : 'Create a new Staff Admin user with LMS access'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Nimal Perera"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nimal@iaac.lk"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Passwords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'New Password (Optional)' : 'Temporary Password'} {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    minLength={8}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? 'Leave blank to keep existing' : 'Min 8 characters'}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={!editingUser && Boolean(formPassword)}
                    minLength={8}
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Allow result updates */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formCanUpdateResults}
                  onChange={(e) => setFormCanUpdateResults(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#003580] focus:ring-blue-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Allow Result Management Access
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Enables staff user to create, edit, publish, and delete student examination results.
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={modalLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {modalLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingUser ? 'Update Account' : 'Create Staff Admin'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
