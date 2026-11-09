import { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  UserPlus,
  Link2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Edit,
  Power,
  KeyRound,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Users,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../api/http.js';
import CreateLecturerModal from '../../components/lecturers/CreateLecturerModal.jsx';
import GenerateInvitationModal from '../../components/lecturers/GenerateInvitationModal.jsx';
import ResetPasswordModal from '../../components/lecturers/ResetPasswordModal.jsx';

export default function AdminLecturersPage() {
  const [activeTab, setActiveTab] = useState('lecturers'); // 'lecturers' | 'links'

  // Lecturers state
  const [lecturers, setLecturers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    disabled: 0,
    rejected: 0,
    selfRegistered: 0,
    superAdmin: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtering state
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Registration links state
  const [invitations, setInvitations] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [lecturerToEdit, setLecturerToEdit] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [resetPasswordLecturer, setResetPasswordLecturer] = useState(null);

  // Load Lecturers
  const loadLecturers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (methodFilter !== 'ALL') params.append('registrationMethod', methodFilter);
      if (statusFilter !== 'ALL') params.append('accountStatus', statusFilter);

      const res = await apiGet(`/api/admin/lecturers?${params.toString()}`);
      setLecturers(Array.isArray(res?.lecturers) ? res.lecturers : []);
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      setError(err?.message || 'Failed to load lecturers.');
    } finally {
      setLoading(false);
    }
  };

  // Load Invitations
  const loadInvitations = async () => {
    setLinksLoading(true);
    try {
      const res = await apiGet('/api/admin/lecturer-invitations');
      setInvitations(Array.isArray(res?.invitations) ? res.invitations : []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    loadLecturers();
  }, [search, methodFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'links') {
      loadInvitations();
    }
  }, [activeTab]);

  // Actions
  const handleApprove = async (id, name) => {
    try {
      await apiPatch(`/api/admin/lecturers/${id}/approve`, {});
      setSuccessMessage(`Lecturer "${name}" has been approved and can now log in.`);
      loadLecturers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (id, name) => {
    const reason = window.prompt(`Enter rejection reason for ${name} (optional):`);
    if (reason === null) return; // user cancelled prompt

    try {
      await apiPatch(`/api/admin/lecturers/${id}/reject`, { reason });
      setSuccessMessage(`Registration for "${name}" has been rejected.`);
      loadLecturers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const handleToggleStatus = async (id, name, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    const confirmMsg =
      newStatus === 'Disabled'
        ? `Are you sure you want to deactivate ${name}? They will lose access to protected LMS features.`
        : `Activate ${name}'s lecturer account?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiPatch(`/api/admin/lecturers/${id}/status`, { status: newStatus });
      setSuccessMessage(`Lecturer "${name}" is now ${newStatus}.`);
      loadLecturers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleRevokeInvitation = async (id, linkName) => {
    if (!window.confirm(`Are you sure you want to revoke "${linkName}"? Any unused tokens will become invalid.`)) {
      return;
    }

    try {
      await apiPatch(`/api/admin/lecturer-invitations/${id}/revoke`, {});
      setSuccessMessage(`Registration link "${linkName}" has been revoked.`);
      loadInvitations();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(`Failed to revoke invitation: ${err.message}`);
    }
  };

  const handleCopyLink = (inv) => {
    const url = `${window.location.origin}/lecturer/register?token=${inv.tokenPrefix || ''}`;
    // If backend provided full token or prefix, copy link
    navigator.clipboard.writeText(url);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (inv) => {
    const url = `${window.location.origin}/lecturer/register?token=${inv.tokenPrefix || ''}`;
    const text = encodeURIComponent(
      `Hello! You have been invited to register as a lecturer at IAAC.\n\nLink Name: ${inv.linkName}\nRegister here: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-7 w-7 text-[#003580]" />
            <span>Lecturer Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Create lecturer accounts, approve self-registrations, and generate secure invitation links.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#003580] bg-white hover:bg-blue-50 px-4 py-2.5 text-xs font-bold text-[#003580] shadow-2xs transition cursor-pointer"
          >
            <Link2 className="h-4 w-4" />
            <span>Generate Registration Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLecturerToEdit(null);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Lecturer</span>
          </button>
        </div>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Lecturers
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Active Accounts
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">{stats.active}</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className={`rounded-2xl border p-4 shadow-sm transition ${
          stats.pending > 0
            ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200'
            : 'border-slate-200 bg-white'
        }`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <span>Pending Approval</span>
            {stats.pending > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-900">{stats.pending}</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Disabled Accounts
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-700">{stats.disabled}</span>
            <Power className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Self Registered
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-900">{stats.selfRegistered}</span>
            <Link2 className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('lecturers')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'lecturers'
              ? 'border-[#003580] text-[#003580] bg-blue-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Lecturer Directory</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
            {lecturers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'links'
              ? 'border-[#003580] text-[#003580] bg-blue-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Registration Links & Invitations</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
            {invitations.length}
          </span>
        </button>
      </div>

      {/* TAB 1: LECTURERS DIRECTORY */}
      {activeTab === 'lecturers' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search lecturers by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9.5 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Method Filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Methods</option>
                <option value="self_registration">Self Registration</option>
                <option value="super_admin">Super Admin</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Disabled">Disabled</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={loadLecturers}
                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Lecturers Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {error && (
              <div className="p-4 text-xs font-semibold text-rose-600 bg-rose-50 border-b border-rose-100">
                {error}
              </div>
            )}

            {loading && lecturers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#003580] border-t-transparent mb-2"></div>
                <div>Loading lecturers from MongoDB...</div>
              </div>
            ) : lecturers.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No lecturer accounts found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Lecturer Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4 text-center">Registration Method</th>
                      <th className="py-3 px-4 text-center">Account Status</th>
                      <th className="py-3 px-4">Assigned Academic / Subject</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lecturers.map((lecturer) => {
                      const isPending = lecturer.accountStatus === 'Pending Approval';
                      const isActive = lecturer.accountStatus === 'Active';
                      const isDisabled = lecturer.accountStatus === 'Disabled';
                      const isRejected = lecturer.accountStatus === 'Rejected';
                      const isSelf = lecturer.registrationMethod === 'self_registration';

                      return (
                        <tr
                          key={lecturer.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isPending ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {/* Name & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003580] text-white font-bold text-xs shadow-2xs">
                                {lecturer.name?.[0] || 'L'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {lecturer.name}
                                </span>
                                {lecturer.canUpdateResults && (
                                  <span className="text-[10px] font-semibold text-emerald-700 block">
                                    Results Management Enabled
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {lecturer.email}
                          </td>

                          {/* Registration Method */}
                          <td className="py-3 px-4 text-center">
                            {isSelf ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                <Link2 className="h-3 w-3 text-blue-600" />
                                <span>Self Registration</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                <ShieldCheck className="h-3 w-3 text-purple-600" />
                                <span>Super Admin</span>
                              </span>
                            )}
                          </td>

                          {/* Account Status */}
                          <td className="py-3 px-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Active
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                Pending Approval
                              </span>
                            ) : isDisabled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                Disabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* Academic / Subject */}
                          <td className="py-3 px-4 text-slate-600">
                            {lecturer.subject ? (
                              <span className="font-semibold text-slate-800 block">
                                {lecturer.subject}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-500">
                              {[lecturer.branchId, lecturer.intakeId, lecturer.batchId]
                                .filter(Boolean)
                                .join(' • ') || 'All Academics'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Pending actions */}
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(lecturer.id, lecturer.name)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition cursor-pointer"
                                    title="Approve registration and activate account"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleReject(lecturer.id, lecturer.name)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition cursor-pointer"
                                    title="Reject registration"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {/* Active actions */}
                              {isActive && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLecturerToEdit(lecturer);
                                      setCreateModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                                    title="Edit profile & assignment"
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setResetPasswordLecturer(lecturer)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                                    title="Reset Password"
                                  >
                                    <KeyRound className="h-3 w-3 text-slate-500" />
                                    <span>Reset Password</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(lecturer.id, lecturer.name, lecturer.accountStatus)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 transition cursor-pointer"
                                    title="Deactivate account"
                                  >
                                    <Power className="h-3 w-3 text-amber-600" />
                                    <span>Deactivate</span>
                                  </button>
                                </>
                              )}

                              {/* Disabled actions */}
                              {isDisabled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(lecturer.id, lecturer.name, lecturer.accountStatus)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition cursor-pointer"
                                    title="Activate account"
                                  >
                                    <Power className="h-3 w-3" />
                                    <span>Activate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLecturerToEdit(lecturer);
                                      setCreateModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>
                                </>
                              )}

                              {/* Rejected actions */}
                              {isRejected && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(lecturer.id, lecturer.name)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white transition cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Re-Approve</span>
                                </button>
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
        </div>
      )}

      {/* TAB 2: REGISTRATION LINKS & INVITATIONS */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Shareable Registration Links
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Generate token-secured URLs for individual or group lecturer registration invitations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
              <span>Generate New Link</span>
            </button>
          </div>

          {/* Links Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {linksLoading && invitations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#003580] border-t-transparent mb-2"></div>
                <div>Loading invitations from database...</div>
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No registration invitation links generated yet. Click "Generate New Link" above to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Link Name</th>
                      <th className="py-3 px-4 text-center">Max Uses</th>
                      <th className="py-3 px-4 text-center">Used</th>
                      <th className="py-3 px-4 text-center">Remaining</th>
                      <th className="py-3 px-4">Expiration</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => {
                      const isActive = inv.status === 'Active';
                      const isRevoked = inv.status === 'Revoked';
                      const isExpired = inv.status === 'Expired';
                      const isUsed = inv.status === 'Used';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {inv.linkName}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {inv.maxUses}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-blue-700">
                            {inv.usedCount}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {inv.remainingUses}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isActive ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                Active
                              </span>
                            ) : isUsed ? (
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                Used
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {inv.createdByName}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isActive && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(inv)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                                    title="Copy registration link"
                                  >
                                    {copiedId === inv.id ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span className="text-emerald-700">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleShareWhatsApp(inv)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition cursor-pointer"
                                    title="Share on WhatsApp"
                                  >
                                    <Share2 className="h-3 w-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvitation(inv.id, inv.linkName)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 transition cursor-pointer"
                                    title="Revoke link"
                                  >
                                    <span>Revoke</span>
                                  </button>
                                </>
                              )}
                              {!isActive && (
                                <span className="text-[11px] text-slate-400 font-medium">—</span>
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
        </div>
      )}

      {/* CREATE / EDIT LECTURER MODAL */}
      <CreateLecturerModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setLecturerToEdit(null);
        }}
        lecturerToEdit={lecturerToEdit}
        onSuccess={() => {
          loadLecturers();
          setSuccessMessage(
            lecturerToEdit
              ? 'Lecturer profile updated successfully.'
              : 'Lecturer account created successfully.'
          );
          setTimeout(() => setSuccessMessage(''), 4000);
        }}
      />

      {/* GENERATE INVITATION MODAL */}
      <GenerateInvitationModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          loadInvitations();
          setSuccessMessage('Registration invitation link created.');
          setTimeout(() => setSuccessMessage(''), 4000);
        }}
      />

      {/* RESET PASSWORD MODAL */}
      <ResetPasswordModal
        isOpen={Boolean(resetPasswordLecturer)}
        onClose={() => setResetPasswordLecturer(null)}
        lecturer={resetPasswordLecturer}
        onSuccess={() => {
          setSuccessMessage('Lecturer password has been reset successfully.');
          setTimeout(() => setSuccessMessage(''), 4000);
        }}
      />
    </div>
  );
}
