import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquareText,
  Star,
  UsersRound,
  FileText,
  Clock3,
  CalendarDays,
  Send,
  Eye,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ListFilter,
  X,
  ShieldAlert,
  LoaderCircle,
  Flag,
  Trash2,
} from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, ApiError } from '../../api/http.js';
import { exportFeedbackReportToPdf } from '../../utils/exportFeedbackReport.js';

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

export default function AdminFeedbackDashboardPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'submissions'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalRequests: 0,
    responsesReceived: 0,
    averageRating: 0,
    pendingReviews: 0,
  });

  // Requests Table Data
  const [requests, setRequests] = useState([]);
  // Submissions Data
  const [submissions, setSubmissions] = useState([]);

  // Academic Dropdown Options
  const [branches, setBranches] = useState([]);
  const [lecturersList, setLecturersList] = useState([]);
  const [batchStudents, setBatchStudents] = useState([]);

  // Filters
  const [filterBranch, setFilterBranch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterLecturer, setFilterLecturer] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Create Request Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createWarning, setCreateWarning] = useState('');
  const [requestForm, setRequestForm] = useState({
    branchId: '',
    intakeId: '',
    batchId: '',
    diplomaId: '',
    moduleId: '',
    lecturerId: '',
    feedbackWeek: 'Week 1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    targetStudents: 'all',
    selectedStudentIds: [],
    isRecurring: false,
  });

  // Summary Review & Send Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryRecommendations, setSummaryRecommendations] = useState('');
  const [summaryStrengths, setSummaryStrengths] = useState([]);
  const [summaryImprovements, setSummaryImprovements] = useState([]);

  // Load KPI Stats
  const loadStats = () => {
    apiGet('/api/admin/feedback/stats')
      .then((data) => setStats(data))
      .catch(() => {});
  };

  // Load Academic Hierarchy & Lecturers
  useEffect(() => {
    apiGet('/api/materials/hierarchy/full')
      .then((data) => setBranches(Array.isArray(data?.branches) ? data.branches : []))
      .catch(() => {});

    apiGet('/api/admin/lecturers')
      .then((data) => setLecturersList(Array.isArray(data?.lecturers) ? data.lecturers : []))
      .catch(() => {});

    loadStats();
  }, []);

  // Load Requests
  const loadRequests = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filterBranch) params.append('branchId', filterBranch);
    if (filterBatch) params.append('batchId', filterBatch);
    if (filterLecturer) params.append('lecturerId', filterLecturer);
    if (filterWeek) params.append('feedbackWeek', filterWeek);
    if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

    apiGet(`/api/admin/feedback/requests?${params.toString()}`)
      .then((data) => setRequests(Array.isArray(data?.requests) ? data.requests : []))
      .catch((e) => setError(e?.message || 'Failed to load feedback requests'))
      .finally(() => setLoading(false));
  };

  // Load Submissions
  const loadSubmissions = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filterLecturer) params.append('lecturerId', filterLecturer);
    if (filterBatch) params.append('batchId', filterBatch);
    if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);

    apiGet(`/api/admin/feedback?${params.toString()}`)
      .then((data) => setSubmissions(Array.isArray(data?.feedback) ? data.feedback : []))
      .catch((e) => setError(e?.message || 'Failed to load submissions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else {
      loadSubmissions();
    }
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterBranch, filterBatch, filterLecturer, filterWeek, filterStatus]);

  // Load students when batch selected in create modal
  useEffect(() => {
    if (requestForm.batchId && requestForm.targetStudents === 'specific') {
      apiGet(`/api/entities/students/batch/${encodeURIComponent(requestForm.batchId)}`)
        .then((d) => setBatchStudents(Array.isArray(d?.students) ? d.students : []))
        .catch(() => setBatchStudents([]));
    }
  }, [requestForm.batchId, requestForm.targetStudents]);

  // Check lecturer assignment mismatch
  useEffect(() => {
    if (requestForm.lecturerId && lecturersList.length > 0) {
      const selectedLec = lecturersList.find((l) => l.id === requestForm.lecturerId);
      if (selectedLec) {
        let warning = '';
        if (selectedLec.batchId && requestForm.batchId && selectedLec.batchId !== requestForm.batchId) {
          warning = `Note: Lecturer registered batch is "${selectedLec.batchId}".`;
        }
        if (selectedLec.subject && requestForm.moduleId && selectedLec.subject.toLowerCase() !== requestForm.moduleId.toLowerCase()) {
          warning = warning
            ? `${warning} Also subject is "${selectedLec.subject}".`
            : `Note: Lecturer registered subject is "${selectedLec.subject}".`;
        }
        setCreateWarning(warning);
      }
    } else {
      setCreateWarning('');
    }
  }, [requestForm.lecturerId, requestForm.batchId, requestForm.moduleId, lecturersList]);

  // Handle Create Feedback Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await apiPost('/api/admin/feedback/requests', requestForm);
      setSuccessMessage('Feedback request successfully created and scheduled.');
      setCreateModalOpen(false);
      loadRequests();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setCreateError(err?.message || 'Failed to create feedback request');
    } finally {
      setCreateLoading(false);
    }
  };

  // Generate / Recalculate Summary
  const handleGenerateSummary = async (requestId) => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await apiPost('/api/admin/feedback/summaries/generate', { requestId });
      setActiveSummary(res.summary);
      setSummaryRecommendations(res.summary?.recommendations || '');
      setSummaryStrengths(res.summary?.strengths || []);
      setSummaryImprovements(res.summary?.improvements || []);
      setSummaryModalOpen(true);
      loadRequests();
      loadStats();
    } catch (err) {
      alert(err?.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Open Review Summary Modal
  const handleOpenReview = async (requestId) => {
    setSummaryLoading(true);
    try {
      const res = await apiPost('/api/admin/feedback/summaries/generate', { requestId });
      setActiveSummary(res.summary);
      setSummaryRecommendations(res.summary?.recommendations || '');
      setSummaryStrengths(res.summary?.strengths || []);
      setSummaryImprovements(res.summary?.improvements || []);
      setSummaryModalOpen(true);
    } catch (err) {
      alert(err?.message || 'Failed to open summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Save Summary Edits
  const handleSaveSummary = async () => {
    if (!activeSummary?._id) return;
    setSummarySaving(true);
    try {
      const res = await apiPut(`/api/admin/feedback/summaries/${activeSummary._id}`, {
        recommendations: summaryRecommendations,
        strengths: summaryStrengths,
        improvements: summaryImprovements,
      });
      setActiveSummary(res.summary);
      setSuccessMessage('Summary draft updated.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setSummaryError(err?.message || 'Failed to save edits');
    } finally {
      setSummarySaving(false);
    }
  };

  // Approve Summary
  const handleApproveSummary = async () => {
    if (!activeSummary?._id) return;
    setSummarySaving(true);
    try {
      const res = await apiPatch(`/api/admin/feedback/summaries/${activeSummary._id}/approve`, {});
      setActiveSummary(res.summary);
      setSuccessMessage('Summary approved successfully. It is now ready to send.');
      loadRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setSummaryError(err?.message || 'Failed to approve summary');
    } finally {
      setSummarySaving(false);
    }
  };

  // Send Summary to Lecturer
  const handleSendSummary = async () => {
    if (!activeSummary?._id) return;
    setSummarySaving(true);
    try {
      const res = await apiPost(`/api/admin/feedback/summaries/${activeSummary._id}/send`, {});
      setActiveSummary(res.summary);
      setSuccessMessage(res.message || 'Feedback summary successfully delivered to lecturer.');
      loadRequests();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setSummaryError(err?.message || 'Failed to send summary');
    } finally {
      setSummarySaving(false);
    }
  };

  // Download PDF Report
  const handleDownloadPdf = async (reqItem) => {
    try {
      const res = await apiPost('/api/admin/feedback/summaries/generate', { requestId: reqItem.id || reqItem._id });
      const s = res.summary;
      await exportFeedbackReportToPdf({
        lecturerName: s.lecturer?.name || reqItem.lecturer?.name,
        lecturerId: s.lecturer?.lecturerId || reqItem.lecturer?.lecturerId,
        module: s.moduleId || reqItem.moduleId,
        batch: s.batchId || reqItem.batchId,
        branch: s.branchId || reqItem.branchId,
        feedbackPeriod: s.feedbackPeriod || reqItem.feedbackWeek,
        totalEligible: s.totalEligible || reqItem.eligibleCount,
        totalResponses: s.totalResponses || reqItem.responseCount,
        responseRate: s.responseRate || 0,
        averageRatings: s.averageRatings || {},
        strengths: s.strengths || [],
        improvements: s.improvements || [],
        concerns: s.concerns || [],
        recommendations: s.recommendations || '',
      });
    } catch (err) {
      alert(err?.message || 'Failed to generate PDF report');
    }
  };

  // Filtered requests based on search query
  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.lecturer?.name?.toLowerCase().includes(q) ||
        r.lecturer?.lecturerId?.toLowerCase().includes(q) ||
        r.moduleId?.toLowerCase().includes(q) ||
        r.batchId?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#003580]">
              <MessageSquareText className="h-6 w-6" aria-hidden="true" />
            </div>
            <span>Student Feedback Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Monitor lecturer performance, review student feedback, and share approved summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/feedback/moderation"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <ShieldAlert className="h-4 w-4 text-slate-500" />
            <span>Moderation Log</span>
          </Link>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Feedback Request</span>
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

      {/* KPI Cards (Section 12 Requirements) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Card 1: Total Feedback Requests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#003580]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{stats.totalRequests}</div>
          <p className="mt-1 text-[11px] text-slate-500">Active & completed sessions</p>
        </div>

        {/* Card 2: Responses Received */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Responses Received</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UsersRound className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{stats.responsesReceived}</div>
          <p className="mt-1 text-[11px] text-slate-500">Individual student reviews</p>
        </div>

        {/* Card 3: Average Lecturer Rating */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Rating</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">{stats.averageRating}</span>
            <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Overall teaching quality score</p>
        </div>

        {/* Card 4: Pending Reviews */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Reviews</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Clock3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">{stats.pendingReviews}</div>
          <p className="mt-1 text-[11px] text-slate-500">Draft summaries awaiting approval</p>
        </div>
      </div>

      {/* Tabs and Filters Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-[#003580] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Weekly Feedback Requests ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-[#003580] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Student Submissions Log
            </button>
          </div>

          <button
            type="button"
            onClick={activeTab === 'requests' ? loadRequests : loadSubmissions}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003580] hover:underline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Multi-faceted Filtering Toolbar (Section 12) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by lecturer name, ID, or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id || b.name} value={b.name || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lecturer Filter */}
          <div>
            <select
              value={filterLecturer}
              onChange={(e) => setFilterLecturer(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">All Lecturers</option>
              {lecturersList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lecturerId ? `${l.lecturerId} - ` : ''}{l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">All Weeks</option>
              <option value="Week 1">Week 1</option>
              <option value="Week 2">Week 2</option>
              <option value="Week 3">Week 3</option>
              <option value="Week 4">Week 4</option>
              <option value="Week 5">Week 5</option>
              <option value="Week 6">Week 6</option>
              <option value="Week 7">Week 7</option>
              <option value="Week 8">Week 8</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Requests Table (Section 13 Requirements) */}
        {activeTab === 'requests' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4">Lecturer ID</th>
                  <th className="py-3 px-4">Lecturer Name</th>
                  <th className="py-3 px-4">Module / Subject</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4 text-center">Week</th>
                  <th className="py-3 px-4 text-center">Responses</th>
                  <th className="py-3 px-4 text-center">Average Rating</th>
                  <th className="py-3 px-4 text-center">Summary Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      No feedback requests found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      {/* Lecturer ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[#003580]">
                        {r.lecturer?.lecturerId || '—'}
                      </td>

                      {/* Lecturer Name */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{r.lecturer?.name || '—'}</span>
                        <span className="text-[10px] text-slate-400 block">{r.branchId}</span>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {r.moduleId}
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold">
                          {r.batchId}
                        </span>
                      </td>

                      {/* Week */}
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {r.feedbackWeek}
                      </td>

                      {/* Responses */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-extrabold text-slate-900">{r.responseCount}</span>
                        <span className="text-slate-400"> / {r.eligibleCount}</span>
                      </td>

                      {/* Average Rating */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-bold text-amber-800">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span>{r.averageRating || '—'}</span>
                        </div>
                      </td>

                      {/* Summary Status */}
                      <td className="py-3 px-4 text-center">
                        {r.summaryStatus === 'Sent' ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-0.5 font-bold text-[10px]">
                            Sent to Lecturer
                          </span>
                        ) : r.summaryStatus === 'Approved' ? (
                          <span className="rounded-full bg-sky-100 border border-sky-300 text-sky-800 px-2.5 py-0.5 font-bold text-[10px]">
                            Approved
                          </span>
                        ) : r.summaryStatus === 'Under Review' ? (
                          <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-800 px-2.5 py-0.5 font-bold text-[10px]">
                            Under Review
                          </span>
                        ) : r.summaryStatus === 'Draft' ? (
                          <span className="rounded-full bg-purple-100 border border-purple-300 text-purple-800 px-2.5 py-0.5 font-bold text-[10px]">
                            Draft
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 font-medium text-[10px]">
                            Pending Summary
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReview(r.id)}
                            title="Generate & Review Summary"
                            className="rounded-lg bg-blue-50 p-1.5 text-[#003580] hover:bg-blue-100 transition cursor-pointer"
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(r)}
                            title="Download PDF Report"
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Submissions Table */}
        {activeTab === 'submissions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Lecturer</th>
                  <th className="py-3 px-4">Module / Week</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4">Comment / Feedback</th>
                  <th className="py-3 px-4 text-center">Submitted</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No student submissions found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{s.student?.name || 'Anonymous Student'}</span>
                        <span className="font-mono text-[10px] text-slate-500">{s.student?.studentId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{s.lecturer?.name}</span>
                        <span className="font-mono text-[10px] text-[#003580]">{s.lecturer?.lecturerId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{s.feedbackRequest?.module || 'Lecture Session'}</span>
                        <span className="text-[10px] text-slate-500">{s.weekRef}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span>{s.rating}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 text-[11px]">{s.comment || s.positiveFeedback}</p>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                        {formatDate(s.submittedAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.flagged ? (
                          <span className="rounded-full bg-rose-100 border border-rose-200 text-rose-700 px-2 py-0.5 text-[10px] font-bold">
                            Flagged
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================
          CREATE FEEDBACK REQUEST MODAL (Section 5 Requirements)
      ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5 text-sky-300" />
                <h2 className="text-base font-bold">Create Weekly Feedback Request</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateRequest} className="p-6 overflow-y-auto space-y-4 text-xs">
              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createWarning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{createWarning}</span>
                </div>
              )}

              {/* Branch Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Branch Campus <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={requestForm.branchId}
                  onChange={(e) => setRequestForm({ ...requestForm, branchId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id || b.name} value={b.name || b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch & Module */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Student Batch <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2026-AV1"
                    value={requestForm.batchId}
                    onChange={(e) => setRequestForm({ ...requestForm, batchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Module / Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aviation Safety Management"
                    value={requestForm.moduleId}
                    onChange={(e) => setRequestForm({ ...requestForm, moduleId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lecturer Selection (Shows ID + Name + Subject) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Lecturer <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={requestForm.lecturerId}
                  onChange={(e) => setRequestForm({ ...requestForm, lecturerId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">Select Lecturer</option>
                  {lecturersList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lecturerId ? `${l.lecturerId} – ` : ''}{l.name} {l.subject ? `(${l.subject})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feedback Week, Start Date, End Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Feedback Week</label>
                  <select
                    value={requestForm.feedbackWeek}
                    onChange={(e) => setRequestForm({ ...requestForm, feedbackWeek: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="Week 1">Week 1</option>
                    <option value="Week 2">Week 2</option>
                    <option value="Week 3">Week 3</option>
                    <option value="Week 4">Week 4</option>
                    <option value="Week 5">Week 5</option>
                    <option value="Week 6">Week 6</option>
                    <option value="Week 7">Week 7</option>
                    <option value="Week 8">Week 8</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={requestForm.startDate}
                    onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closing Deadline</label>
                  <input
                    type="date"
                    required
                    value={requestForm.endDate}
                    onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Student Targeting */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Targeting</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="targeting"
                      checked={requestForm.targetStudents === 'all'}
                      onChange={() => setRequestForm({ ...requestForm, targetStudents: 'all' })}
                    />
                    <span>All Students in Batch</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="targeting"
                      checked={requestForm.targetStudents === 'specific'}
                      onChange={() => setRequestForm({ ...requestForm, targetStudents: 'specific' })}
                    />
                    <span>Specific Students</span>
                  </label>
                </div>
              </div>

              {/* Recurring Toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestForm.isRecurring}
                  onChange={(e) => setRequestForm({ ...requestForm, isRecurring: e.target.checked })}
                  className="rounded border-slate-300 text-[#003580]"
                />
                <span className="font-semibold text-slate-700">
                  Enable automatic weekly recurrence for this lecture
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {createLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  <span>Publish Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          REVIEW & SEND FEEDBACK SUMMARY MODAL (Section 15, 16, 17)
      ========================================================= */}
      {summaryModalOpen && activeSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div>
                <h2 className="text-base font-bold">Review & Approve Lecturer Feedback Summary</h2>
                <p className="text-[11px] text-sky-200 mt-0.5">
                  Academic quality assurance review before sharing with the lecturer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {summaryError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{summaryError}</span>
                </div>
              )}

              {/* Recipient Verification Card (Section 16 & 17) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Recipient Lecturer</span>
                  <span className="font-extrabold text-slate-900 text-sm">{activeSummary.lecturer?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Unique Lecturer ID</span>
                  <span className="font-mono font-bold text-[#003580] text-sm">{activeSummary.lecturer?.lecturerId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Feedback Period</span>
                  <span className="font-semibold text-slate-800 text-xs">{activeSummary.feedbackPeriod}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Current Status</span>
                  <span className="font-bold text-xs text-purple-800 uppercase">{activeSummary.status}</span>
                </div>
              </div>

              {/* Ratings Grid */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Teaching Quality Ratings (5-Point Scale)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">Clarity</span>
                    <span className="font-extrabold text-slate-900 text-base">{activeSummary.averageRatings?.teachingClarity || 0}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">Knowledge</span>
                    <span className="font-extrabold text-slate-900 text-base">{activeSummary.averageRatings?.subjectKnowledge || 0}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">Communication</span>
                    <span className="font-extrabold text-slate-900 text-base">{activeSummary.averageRatings?.communication || 0}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">Engagement</span>
                    <span className="font-extrabold text-slate-900 text-base">{activeSummary.averageRatings?.studentEngagement || 0}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">Experience</span>
                    <span className="font-extrabold text-slate-900 text-base">{activeSummary.averageRatings?.overallExperience || 0}</span>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-center">
                    <span className="text-[10px] text-[#003580] block font-bold">Overall Score</span>
                    <span className="font-extrabold text-[#003580] text-base">{activeSummary.averageRatings?.overall || 0}</span>
                  </div>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Key Teaching Strengths</h4>
                  <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[11px] text-slate-700">
                    {summaryStrengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Areas for Enhancement</h4>
                  <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[11px] text-slate-700">
                    {summaryImprovements.length > 0 ? (
                      summaryImprovements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400">No major areas of concern noted.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Administrator Recommendations (Editable) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Administrator Recommendations (Constructive Guidance for Lecturer)
                </label>
                <textarea
                  rows={3}
                  value={summaryRecommendations}
                  onChange={(e) => setSummaryRecommendations(e.target.value)}
                  placeholder="Enter administrative guidance, constructive feedback, or action points..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleSaveSummary}
                  disabled={summarySaving}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Save Draft Changes
                </button>

                <div className="flex items-center gap-2">
                  {activeSummary.status !== 'Approved' && activeSummary.status !== 'Sent' && (
                    <button
                      type="button"
                      onClick={handleApproveSummary}
                      disabled={summarySaving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 font-bold text-white shadow-2xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Summary</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSendSummary}
                    disabled={summarySaving || activeSummary.status === 'Sent'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>{activeSummary.status === 'Sent' ? 'Delivered' : 'Send to Lecturer'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
