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
  Pencil,
  Save,
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

  // Dynamic Options for Modal & Filters (Fetched from backend)
  const [intakesList, setIntakesList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [diplomasList, setDiplomasList] = useState([
    'Cabin Crew',
    'Ground Operations',
    'Ticketing & Reservations',
    'Air Cargo',
  ]);
  const [modulesList, setModulesList] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [customBatchMode, setCustomBatchMode] = useState(false);

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

  // Edit & Delete Request State
  const [editRequestModalOpen, setEditRequestModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editRequestLoading, setEditRequestLoading] = useState(false);
  const [editRequestError, setEditRequestError] = useState('');
  const [editCustomBatchMode, setEditCustomBatchMode] = useState(false);
  const [editRequestForm, setEditRequestForm] = useState({
    branchId: '',
    intakeId: '',
    batchId: '',
    diplomaId: '',
    moduleId: '',
    lecturerId: '',
    feedbackWeek: 'Week 1',
    startDate: '',
    endDate: '',
    status: 'Active',
    targetStudents: 'all',
    isRecurring: false,
  });

  const [deleteRequestModalOpen, setDeleteRequestModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [deleteRequestLoading, setDeleteRequestLoading] = useState(false);

  // Edit & Delete Submission State
  const [editSubmissionModalOpen, setEditSubmissionModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [editSubmissionLoading, setEditSubmissionLoading] = useState(false);
  const [editSubmissionError, setEditSubmissionError] = useState('');
  const [editSubmissionForm, setEditSubmissionForm] = useState({
    rating: 5,
    ratings: {
      teachingClarity: 5,
      subjectKnowledge: 5,
      communication: 5,
      studentEngagement: 5,
      overallExperience: 5,
    },
    comment: '',
    positiveFeedback: '',
    improvementFeedback: '',
    learningDifficulties: '',
    concerns: '',
    suggestions: '',
    flagged: false,
    status: 'active',
  });

  const [deleteSubmissionModalOpen, setDeleteSubmissionModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [deletePermanent, setDeletePermanent] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmissionLoading, setDeleteSubmissionLoading] = useState(false);

  // Load KPI Stats
  const loadStats = () => {
    apiGet('/api/admin/feedback/stats')
      .then((data) => setStats(data))
      .catch(() => {});
  };

  // Load Academic Hierarchy & Lecturers
  useEffect(() => {
    apiGet('/api/admin/feedback/academic-options')
      .then((data) => {
        if (Array.isArray(data?.branches)) setBranches(data.branches);
        if (Array.isArray(data?.diplomas) && data.diplomas.length > 0) setDiplomasList(data.diplomas);
        if (Array.isArray(data?.batches)) setAllBatches(data.batches);
        if (Array.isArray(data?.modules)) setModulesList(data.modules);
      })
      .catch(() => {
        apiGet('/api/materials/hierarchy/full')
          .then((data) => setBranches(Array.isArray(data?.branches) ? data.branches : []))
          .catch(() => {});
      });

    apiGet('/api/admin/lecturers')
      .then((data) => setLecturersList(Array.isArray(data?.lecturers) ? data.lecturers : []))
      .catch(() => {});

    loadStats();
  }, []);

  // Cascading Hierarchy: Branch -> Intake -> Batch
  const selectedBranchObj = useMemo(() => {
    if (!requestForm.branchId) return null;
    return (
      branches.find(
        (b) =>
          String(b.id || '') === String(requestForm.branchId) ||
          String(b.name || '') === String(requestForm.branchId)
      ) || null
    );
  }, [branches, requestForm.branchId]);

  const availableIntakes = useMemo(() => {
    if (intakesList.length > 0) return intakesList;
    if (!selectedBranchObj) return [];
    return Array.isArray(selectedBranchObj.intakes) ? selectedBranchObj.intakes : [];
  }, [intakesList, selectedBranchObj]);

  const selectedIntakeObj = useMemo(() => {
    if (!requestForm.intakeId || !availableIntakes.length) return null;
    return (
      availableIntakes.find(
        (i) =>
          String(i.id || '') === String(requestForm.intakeId) ||
          String(i.name || '') === String(requestForm.intakeId)
      ) || null
    );
  }, [availableIntakes, requestForm.intakeId]);

  const availableBatches = useMemo(() => {
    if (batchesList.length > 0) return batchesList;
    if (!selectedIntakeObj) return [];
    return Array.isArray(selectedIntakeObj.batches) ? selectedIntakeObj.batches : [];
  }, [batchesList, selectedIntakeObj]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setRequestForm((prev) => ({
      ...prev,
      branchId: val,
      intakeId: '',
      batchId: '',
    }));
    setIntakesList([]);
    setBatchesList([]);
  };

  const handleIntakeChange = (e) => {
    const val = e.target.value;
    const chosen = availableIntakes.find(
      (i) => String(i.id || '') === String(val) || String(i.name || '') === String(val)
    );
    const subBatches = Array.isArray(chosen?.batches) ? chosen.batches : [];
    const firstBatch = subBatches[0]?.id || chosen?.id || val;
    setRequestForm((prev) => ({
      ...prev,
      intakeId: val,
      batchId: firstBatch,
    }));
  };

  const handleDiplomaChange = (e) => {
    setRequestForm((prev) => ({
      ...prev,
      diplomaId: e.target.value,
    }));
  };

  // Edit Request Cascading Hierarchy
  const editSelectedBranchObj = useMemo(() => {
    if (!editRequestForm.branchId) return null;
    return (
      branches.find(
        (b) =>
          String(b.id || '') === String(editRequestForm.branchId) ||
          String(b.name || '') === String(editRequestForm.branchId)
      ) || null
    );
  }, [branches, editRequestForm.branchId]);

  const editAvailableIntakes = useMemo(() => {
    if (!editSelectedBranchObj) return [];
    return Array.isArray(editSelectedBranchObj.intakes) ? editSelectedBranchObj.intakes : [];
  }, [editSelectedBranchObj]);

  const editSelectedIntakeObj = useMemo(() => {
    if (!editRequestForm.intakeId || !editAvailableIntakes.length) return null;
    return (
      editAvailableIntakes.find(
        (i) =>
          String(i.id || '') === String(editRequestForm.intakeId) ||
          String(i.name || '') === String(editRequestForm.intakeId)
      ) || null
    );
  }, [editAvailableIntakes, editRequestForm.intakeId]);

  const editAvailableBatches = useMemo(() => {
    if (!editSelectedIntakeObj) return [];
    return Array.isArray(editSelectedIntakeObj.batches) ? editSelectedIntakeObj.batches : [];
  }, [editSelectedIntakeObj]);

  const handleEditBranchChange = (e) => {
    const val = e.target.value;
    setEditRequestForm((prev) => ({
      ...prev,
      branchId: val,
      intakeId: '',
      batchId: '',
    }));
  };

  const handleEditIntakeChange = (e) => {
    const val = e.target.value;
    const chosen = editAvailableIntakes.find(
      (i) => String(i.id || '') === String(val) || String(i.name || '') === String(val)
    );
    const subBatches = Array.isArray(chosen?.batches) ? chosen.batches : [];
    const firstBatch = subBatches[0]?.id || chosen?.id || val;
    setEditRequestForm((prev) => ({
      ...prev,
      intakeId: val,
      batchId: firstBatch,
    }));
  };

  const handleOpenEditRequest = (reqItem) => {
    setEditingRequestId(reqItem.id);
    setEditRequestForm({
      branchId: reqItem.branchId || '',
      intakeId: reqItem.intakeId || '',
      batchId: reqItem.batchId || '',
      diplomaId: reqItem.diplomaId || '',
      moduleId: reqItem.moduleId || '',
      lecturerId: reqItem.lecturer?.id || reqItem.lecturer?._id || reqItem.lecturer || '',
      feedbackWeek: reqItem.feedbackWeek || 'Week 1',
      startDate: reqItem.startDate ? new Date(reqItem.startDate).toISOString().split('T')[0] : '',
      endDate: reqItem.endDate ? new Date(reqItem.endDate).toISOString().split('T')[0] : '',
      status: reqItem.status || 'Active',
      targetStudents: reqItem.targetStudents || 'all',
      isRecurring: Boolean(reqItem.isRecurring),
    });
    setEditCustomBatchMode(false);
    setEditRequestError('');
    setEditRequestModalOpen(true);
  };

  const handleSaveEditRequest = async (e) => {
    e.preventDefault();
    if (!editingRequestId) return;
    setEditRequestLoading(true);
    setEditRequestError('');
    try {
      const payload = {
        ...editRequestForm,
        batchId: editRequestForm.batchId || editRequestForm.intakeId,
      };
      await apiPut(`/api/admin/feedback/requests/${editingRequestId}`, payload);
      setSuccessMessage('Feedback request updated successfully.');
      setEditRequestModalOpen(false);
      loadRequests();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setEditRequestError(err?.message || 'Failed to update feedback request');
    } finally {
      setEditRequestLoading(false);
    }
  };

  const handleOpenDeleteRequest = (reqItem) => {
    setRequestToDelete(reqItem);
    setDeleteRequestModalOpen(true);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    setDeleteRequestLoading(true);
    try {
      await apiDelete(`/api/admin/feedback/requests/${requestToDelete.id}`);
      setSuccessMessage('Feedback request deleted successfully.');
      setDeleteRequestModalOpen(false);
      setRequestToDelete(null);
      loadRequests();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err?.message || 'Failed to delete feedback request');
    } finally {
      setDeleteRequestLoading(false);
    }
  };

  const handleOpenEditSubmission = (subItem) => {
    setEditingSubmission(subItem);
    setEditSubmissionForm({
      rating: subItem.rating || 5,
      ratings: subItem.ratings || {
        teachingClarity: subItem.rating || 5,
        subjectKnowledge: subItem.rating || 5,
        communication: subItem.rating || 5,
        studentEngagement: subItem.rating || 5,
        overallExperience: subItem.rating || 5,
      },
      comment: subItem.comment || '',
      positiveFeedback: subItem.positiveFeedback || '',
      improvementFeedback: subItem.improvementFeedback || '',
      learningDifficulties: subItem.learningDifficulties || '',
      concerns: subItem.concerns || '',
      suggestions: subItem.suggestions || '',
      flagged: Boolean(subItem.flagged),
      status: subItem.status || 'active',
    });
    setEditSubmissionError('');
    setEditSubmissionModalOpen(true);
  };

  const handleSaveEditSubmission = async (e) => {
    e.preventDefault();
    if (!editingSubmission) return;
    setEditSubmissionLoading(true);
    setEditSubmissionError('');
    try {
      await apiPut(`/api/admin/feedback/${editingSubmission.id}`, editSubmissionForm);
      setSuccessMessage('Student feedback submission updated successfully.');
      setEditSubmissionModalOpen(false);
      setEditingSubmission(null);
      loadSubmissions();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setEditSubmissionError(err?.message || 'Failed to update feedback');
    } finally {
      setEditSubmissionLoading(false);
    }
  };

  const handleOpenDeleteSubmission = (subItem) => {
    setSubmissionToDelete(subItem);
    setDeleteReason('');
    setDeletePermanent(false);
    setDeleteSubmissionModalOpen(true);
  };

  const handleConfirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setDeleteSubmissionLoading(true);
    try {
      const url = `/api/admin/feedback/${submissionToDelete.id}?reason=${encodeURIComponent(
        deleteReason || 'Removed by admin'
      )}&permanent=${deletePermanent ? 'true' : 'false'}`;
      await apiDelete(url);
      setSuccessMessage(
        deletePermanent ? 'Feedback permanently deleted.' : 'Feedback removed and hidden from reports.'
      );
      setDeleteSubmissionModalOpen(false);
      setSubmissionToDelete(null);
      loadSubmissions();
      loadStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err?.message || 'Failed to remove feedback');
    } finally {
      setDeleteSubmissionLoading(false);
    }
  };

  // Fetch Intakes and Batches when Branch changes in Create Modal
  useEffect(() => {
    if (!requestForm.branchId) {
      setIntakesList([]);
      setBatchesList([]);
      return;
    }

    apiGet(`/api/admin/feedback/academic-options?branchId=${encodeURIComponent(requestForm.branchId)}`)
      .then((data) => {
        if (Array.isArray(data?.intakes) && data.intakes.length > 0) {
          setIntakesList(data.intakes);
        }
        if (Array.isArray(data?.batches) && data.batches.length > 0) {
          setBatchesList(data.batches);
        }
        if (Array.isArray(data?.modules) && data.modules.length > 0) {
          setModulesList(data.modules);
        }
      })
      .catch(() => {});
  }, [requestForm.branchId]);

  // Fetch Batches when Intake changes in Create Modal
  useEffect(() => {
    if (!requestForm.branchId || !requestForm.intakeId) return;

    apiGet(
      `/api/admin/feedback/academic-options?branchId=${encodeURIComponent(
        requestForm.branchId
      )}&intakeId=${encodeURIComponent(requestForm.intakeId)}`
    )
      .then((data) => {
        if (Array.isArray(data?.batches) && data.batches.length > 0) {
          setBatchesList(data.batches);
        }
      })
      .catch(() => {});
  }, [requestForm.branchId, requestForm.intakeId]);

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
      const payload = {
        ...requestForm,
        batchId: requestForm.batchId || requestForm.intakeId,
      };
      if (!payload.branchId) throw new Error('Please select a Branch Campus.');
      if (!payload.intakeId) throw new Error('Please select an Academic Intake.');
      if (!payload.batchId) throw new Error('Please select a Student Batch.');
      if (!payload.diplomaId) throw new Error('Please select a Diploma.');
      if (!payload.moduleId) throw new Error('Please enter a Module / Subject.');
      if (!payload.lecturerId) throw new Error('Please select an Assigned Lecturer.');

      await apiPost('/api/admin/feedback/requests', payload);
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
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

          {/* Batch Filter */}
          <div>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">All Batches</option>
              {allBatches.map((b) => (
                <option key={b.id || b.name} value={b.id || b.name}>
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

                          <button
                            type="button"
                            onClick={() => handleOpenEditRequest(r)}
                            title="Edit Feedback Request"
                            className="rounded-lg bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteRequest(r)}
                            title="Delete Feedback Request"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
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
                        ) : s.status === 'removed' ? (
                          <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-medium line-through">
                            Removed
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSubmission(s)}
                            title="Edit Feedback"
                            className="rounded-lg bg-blue-50 p-1.5 text-[#003580] hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteSubmission(s)}
                            title="Delete / Remove Feedback"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
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

              {/* Row 1: Academic Hierarchy (Branch -> Intake -> Diploma) Matching Image 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Branch Campus */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={requestForm.branchId}
                    onChange={handleBranchChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id || b.name} value={b.id || b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Academic Intake (shows only this branch's intakes) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Intake <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!requestForm.branchId}
                    value={requestForm.intakeId}
                    onChange={handleIntakeChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!requestForm.branchId
                        ? 'Select Branch First'
                        : availableIntakes.length === 0
                        ? 'No Intakes Found'
                        : 'Select Intake'}
                    </option>
                    {availableIntakes.map((i) => (
                      <option key={i.id || i.name} value={i.id || i.name}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Diploma Selection */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Diploma <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={requestForm.diplomaId}
                    onChange={handleDiplomaChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Diploma</option>
                    {diplomasList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Batch Sub-group or Custom Batch */}
              {(availableBatches.length > 0 || customBatchMode) ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 text-[11px]">
                      Student Batch (Sub-group)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomBatchMode(!customBatchMode)}
                      className="text-[10px] font-semibold text-[#003580] hover:underline cursor-pointer"
                    >
                      {customBatchMode ? 'Select from list' : '+ Custom Batch'}
                    </button>
                  </div>

                  {customBatchMode ? (
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-AV1"
                      value={requestForm.batchId}
                      onChange={(e) => setRequestForm({ ...requestForm, batchId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#003580]"
                    />
                  ) : (
                    <select
                      value={requestForm.batchId}
                      onChange={(e) => setRequestForm({ ...requestForm, batchId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#003580]"
                    >
                      <option value={requestForm.intakeId}>
                        All Students in {selectedIntakeObj?.name || 'Intake'}
                      </option>
                      {availableBatches.map((b) => (
                        <option key={b.id || b.name} value={b.id || b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    onClick={() => setCustomBatchMode(true)}
                    className="text-[10px] font-semibold text-[#003580] hover:underline cursor-pointer"
                  >
                    + Custom Batch Code
                  </button>
                </div>
              )}

              {/* Row 2: Module & Lecturer (2-Column Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Module / Subject */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Module / Subject <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="modules-datalist"
                      placeholder="Select or enter module / subject (e.g. Aviation Safety Management)"
                      value={requestForm.moduleId}
                      onChange={(e) => setRequestForm({ ...requestForm, moduleId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                    />
                    <datalist id="modules-datalist">
                      {modulesList.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
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
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Lecturer</option>
                    {lecturersList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lecturerId ? `${l.lecturerId} – ` : ''}{l.name} {l.subject ? `(${l.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
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

      {/* =========================================================
          EDIT FEEDBACK REQUEST MODAL
      ========================================================= */}
      {editRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Pencil className="h-5 w-5 text-sky-300" />
                <h2 className="text-base font-bold">Edit Weekly Feedback Request</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditRequestModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEditRequest} className="p-6 overflow-y-auto space-y-4 text-xs">
              {editRequestError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editRequestError}</span>
                </div>
              )}

              {/* Row 1: Academic Hierarchy (3-Column Selector Matching Image 2) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Branch */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editRequestForm.branchId}
                    onChange={handleEditBranchChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id || b.name} value={b.id || b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Intake */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Intake <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!editRequestForm.branchId}
                    value={editRequestForm.intakeId}
                    onChange={handleEditIntakeChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580] disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!editRequestForm.branchId
                        ? 'Select Branch First'
                        : editAvailableIntakes.length === 0
                        ? 'No Intakes Found'
                        : 'Select Intake'}
                    </option>
                    {editAvailableIntakes.map((i) => (
                      <option key={i.id || i.name} value={i.id || i.name}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diploma */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Diploma <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editRequestForm.diplomaId}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, diplomaId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Diploma</option>
                    {diplomasList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Batch Sub-group or Custom Batch */}
              {(editAvailableBatches.length > 0 || editCustomBatchMode) ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 text-[11px]">
                      Student Batch (Sub-group)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditCustomBatchMode(!editCustomBatchMode)}
                      className="text-[10px] font-semibold text-[#003580] hover:underline cursor-pointer"
                    >
                      {editCustomBatchMode ? 'Select from list' : '+ Custom Batch'}
                    </button>
                  </div>

                  {editCustomBatchMode ? (
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-AV1"
                      value={editRequestForm.batchId}
                      onChange={(e) => setEditRequestForm({ ...editRequestForm, batchId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#003580]"
                    />
                  ) : (
                    <select
                      value={editRequestForm.batchId}
                      onChange={(e) => setEditRequestForm({ ...editRequestForm, batchId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#003580]"
                    >
                      <option value={editRequestForm.intakeId}>
                        All Students in {editSelectedIntakeObj?.name || 'Intake'}
                      </option>
                      {editAvailableBatches.map((b) => (
                        <option key={b.id || b.name} value={b.id || b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    onClick={() => setEditCustomBatchMode(true)}
                    className="text-[10px] font-semibold text-[#003580] hover:underline cursor-pointer"
                  >
                    + Custom Batch Code
                  </button>
                </div>
              )}

              {/* Row 2: Module & Lecturer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Module / Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="edit-modules-datalist"
                    placeholder="e.g. Aviation Safety Management"
                    value={editRequestForm.moduleId}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, moduleId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  />
                  <datalist id="edit-modules-datalist">
                    {modulesList.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned Lecturer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editRequestForm.lecturerId}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, lecturerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#003580] focus:ring-1 focus:ring-[#003580]"
                  >
                    <option value="">Select Lecturer</option>
                    {lecturersList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lecturerId ? `${l.lecturerId} – ` : ''}{l.name} {l.subject ? `(${l.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Week, Dates, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Feedback Week</label>
                  <select
                    value={editRequestForm.feedbackWeek}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, feedbackWeek: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  >
                    {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'].map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editRequestForm.startDate}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closing Deadline</label>
                  <input
                    type="date"
                    required
                    value={editRequestForm.endDate}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Request Status</label>
                  <select
                    value={editRequestForm.status}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Recurring Toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editRequestForm.isRecurring}
                  onChange={(e) => setEditRequestForm({ ...editRequestForm, isRecurring: e.target.checked })}
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
                  onClick={() => setEditRequestModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editRequestLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {editRequestLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          DELETE FEEDBACK REQUEST MODAL
      ========================================================= */}
      {deleteRequestModalOpen && requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-6 py-4 text-rose-900">
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-bold">Delete Feedback Request</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700">
                Are you sure you want to delete this weekly feedback request?
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Lecturer:</span>
                  <span className="font-bold text-slate-900">{requestToDelete.lecturer?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Module:</span>
                  <span className="font-bold text-slate-800">{requestToDelete.moduleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Batch / Week:</span>
                  <span className="font-mono text-slate-800">{requestToDelete.batchId} ({requestToDelete.feedbackWeek})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Responses:</span>
                  <span className="font-extrabold text-[#003580]">{requestToDelete.responseCount || 0} received</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Deleting this request will also remove all associated student responses. This action cannot be undone.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteRequestModalOpen(false)}
                  disabled={deleteRequestLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRequest}
                  disabled={deleteRequestLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {deleteRequestLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          EDIT FEEDBACK SUBMISSION MODAL
      ========================================================= */}
      {editSubmissionModalOpen && editingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Pencil className="h-5 w-5 text-sky-300" />
                <h2 className="text-base font-bold">Edit Student Feedback Submission</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditSubmissionModalOpen(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEditSubmission} className="p-6 overflow-y-auto space-y-4 text-xs">
              {editSubmissionError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editSubmissionError}</span>
                </div>
              )}

              {/* Student & Lecturer Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Student</span>
                  <span className="font-extrabold text-slate-900 text-xs block">{editingSubmission.student?.name || 'Anonymous'}</span>
                  <span className="font-mono text-[10px] text-slate-500">{editingSubmission.student?.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Lecturer</span>
                  <span className="font-bold text-slate-900 text-xs block">{editingSubmission.lecturer?.name || '—'}</span>
                  <span className="font-mono text-[10px] text-[#003580]">{editingSubmission.lecturer?.lecturerId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Week / Module</span>
                  <span className="font-semibold text-slate-800 text-xs block">{editingSubmission.weekRef}</span>
                  <span className="text-[10px] text-slate-500">{editingSubmission.feedbackRequest?.module || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Overall Rating</span>
                  <div className="inline-flex items-center gap-1 font-bold text-amber-700 mt-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    <span className="text-sm font-extrabold">{editSubmissionForm.rating} / 5</span>
                  </div>
                </div>
              </div>

              {/* Overall Rating Slider / Select */}
              <div className="rounded-xl border border-slate-200 p-3">
                <label className="block font-bold text-slate-800 mb-2">Overall Teaching Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setEditSubmissionForm({ ...editSubmissionForm, rating: starVal })}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                        editSubmissionForm.rating === starVal
                          ? 'bg-amber-100 border border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${editSubmissionForm.rating >= starVal ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
                      <span>{starVal}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5-Category Rating Breakdown */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Category Ratings Breakdown (1-5)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'teachingClarity', label: 'Clarity' },
                    { key: 'subjectKnowledge', label: 'Knowledge' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'studentEngagement', label: 'Engagement' },
                    { key: 'overallExperience', label: 'Experience' },
                  ].map((cat) => (
                    <div key={cat.key} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                      <span className="text-[10px] font-semibold text-slate-600 block mb-1">{cat.label}</span>
                      <select
                        value={editSubmissionForm.ratings?.[cat.key] ?? editSubmissionForm.rating}
                        onChange={(e) =>
                          setEditSubmissionForm({
                            ...editSubmissionForm,
                            ratings: {
                              ...editSubmissionForm.ratings,
                              [cat.key]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-xs"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>{n} ★</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments & Written Feedback */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">General Comment</label>
                  <textarea
                    rows={2}
                    value={editSubmissionForm.comment}
                    onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, comment: e.target.value })}
                    placeholder="General student comments..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Positive Feedback (Strengths)</label>
                    <textarea
                      rows={2}
                      value={editSubmissionForm.positiveFeedback}
                      onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, positiveFeedback: e.target.value })}
                      placeholder="What the lecturer did well..."
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Areas for Improvement</label>
                    <textarea
                      rows={2}
                      value={editSubmissionForm.improvementFeedback}
                      onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, improvementFeedback: e.target.value })}
                      placeholder="Suggestions for teaching improvement..."
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Learning Difficulties</label>
                    <textarea
                      rows={2}
                      value={editSubmissionForm.learningDifficulties}
                      onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, learningDifficulties: e.target.value })}
                      placeholder="Specific difficulties faced..."
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Suggestions</label>
                    <textarea
                      rows={2}
                      value={editSubmissionForm.suggestions}
                      onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, suggestions: e.target.value })}
                      placeholder="Additional suggestions..."
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Moderation Controls (Flagged & Status) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSubmissionForm.flagged}
                    onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, flagged: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600"
                  />
                  <span className="font-semibold text-slate-800">
                    Flag this submission for administrative review
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">Status:</span>
                  <select
                    value={editSubmissionForm.status}
                    onChange={(e) => setEditSubmissionForm({ ...editSubmissionForm, status: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="removed">Removed (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditSubmissionModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmissionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {editSubmissionLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          DELETE FEEDBACK SUBMISSION MODAL
      ========================================================= */}
      {deleteSubmissionModalOpen && submissionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-6 py-4 text-rose-900">
              <div className="flex items-center gap-2.5">
                <Trash2 className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-bold">Remove / Delete Feedback</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSubmissionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Student:</span>
                  <span className="font-bold text-slate-900">{submissionToDelete.student?.name || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Lecturer:</span>
                  <span className="font-bold text-slate-800">{submissionToDelete.lecturer?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Rating:</span>
                  <span className="font-bold text-amber-700">{submissionToDelete.rating} ★</span>
                </div>
                {submissionToDelete.comment && (
                  <div className="pt-1 text-slate-600 italic border-t border-slate-200">
                    "{submissionToDelete.comment.slice(0, 100)}..."
                  </div>
                )}
              </div>

              {/* Removal Type Choice */}
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteType"
                    checked={!deletePermanent}
                    onChange={() => setDeletePermanent(false)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Soft Remove (Recommended)</span>
                    <span className="text-[11px] text-slate-500 block">
                      Hides this feedback from lecturer summaries and reports, while preserving an audit log.
                    </span>
                  </div>
                </label>

                {!deletePermanent && (
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Reason for removal (e.g. Inappropriate language)"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                )}

                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="deleteType"
                    checked={deletePermanent}
                    onChange={() => setDeletePermanent(true)}
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-rose-700 block">Permanently Delete</span>
                    <span className="text-[11px] text-slate-500 block">
                      Completely removes this feedback from the database.
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteSubmissionModalOpen(false)}
                  disabled={deleteSubmissionLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSubmission}
                  disabled={deleteSubmissionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {deleteSubmissionLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{deletePermanent ? 'Permanently Delete' : 'Remove Feedback'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
