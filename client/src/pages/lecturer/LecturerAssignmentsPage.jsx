import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UsersRound,
  Download,
  X,
  LoaderCircle,
  CalendarDays,
} from 'lucide-react';
import {
  fetchAdminAssignments,
  fetchAssignmentHierarchy,
  createAssignment,
} from '../../services/assignments.service.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

function formatDeadline(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LecturerAssignmentsPage() {
  const { lecturer } = useOutletContext() || {};

  const [assignments, setAssignments] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCourse, setFormCourse] = useState(COURSES[0]);
  const [formBranchId, setFormBranchId] = useState('');
  const [formBatchId, setFormBatchId] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formFile, setFormFile] = useState(null);

  // Submissions Modal State
  const [submissionsModalItem, setSubmissionsModalItem] = useState(null);

  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const [hRes, aRes] = await Promise.allSettled([
        fetchAssignmentHierarchy(),
        fetchAdminAssignments(),
      ]);

      if (hRes.status === 'fulfilled' && Array.isArray(hRes.value)) {
        setHierarchy(hRes.value);
        if (!formBranchId && hRes.value.length > 0) {
          const firstBranch = hRes.value[0];
          setFormBranchId(lecturer?.branchId || firstBranch.id);
          const firstIntake = firstBranch.intakes?.[0];
          const firstBatch = firstIntake?.batches?.[0];
          if (firstBatch) setFormBatchId(lecturer?.batchId || firstBatch.id);
        }
      }

      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) {
        setAssignments(aRes.value);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const availableBatches = useMemo(() => {
    const branch = hierarchy.find((b) => String(b.id) === String(formBranchId));
    if (!branch) return [];
    const batches = [];
    for (const intake of Array.isArray(branch.intakes) ? branch.intakes : []) {
      for (const batch of Array.isArray(intake.batches) ? intake.batches : []) {
        if (batch?.id) batches.push(batch);
      }
    }
    return batches;
  }, [hierarchy, formBranchId]);

  const handleOpenCreateModal = () => {
    setModalError('');
    setFormTitle('');
    setFormDescription('');
    setFormCourse(COURSES[0]);
    setFormBranchId(lecturer?.branchId || (hierarchy[0]?.id || ''));
    setFormBatchId(lecturer?.batchId || '');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    setFormDeadline(d.toISOString().slice(0, 16));
    setFormFile(null);
    setModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formTitle.trim()) {
      setModalError('Please enter an assignment title.');
      return;
    }
    if (!formDeadline) {
      setModalError('Please select a due date and time.');
      return;
    }

    setSubmitting(true);
    try {
      await createAssignment({
        title: formTitle.trim(),
        description: formDescription.trim() || 'Please complete and submit before the deadline.',
        course: formCourse,
        branchId: formBranchId || lecturer?.branchId || 'main',
        batchId: formBatchId || lecturer?.batchId || 'batch1',
        deadline: new Date(formDeadline).toISOString(),
        referenceDocument: formFile,
      });

      setSuccessMessage(`Assignment "${formTitle.trim()}" created successfully.`);
      setModalOpen(false);
      loadAssignments();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setModalError(err?.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <ClipboardList size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <span>Assignments</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create assignments, set deadlines, and review student file submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2.5 font-medium text-white shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} strokeWidth={1.8} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Assignment List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-[#173B75] mb-3" aria-hidden="true" />
            <p className="font-bold text-slate-700">Loading assignments from database...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <ClipboardList size={36} strokeWidth={1.8} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
            <p className="text-base font-bold text-slate-800">No assignments created yet</p>
            <p className="mt-1 text-slate-400">
              Click the "Create Assignment" button above to publish coursework.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((item) => {
              const isPast = new Date(item.deadline) < new Date();
              const submissions = Array.isArray(item.submissions) ? item.submissions : [];

              return (
                <div
                  key={item._id || item.id}
                  className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                      <ClipboardList size={22} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          {item.course}
                        </span>
                        {item.batchId && (
                          <span className="rounded-md bg-purple-50 text-purple-800 px-2.5 py-0.5 text-xs font-bold">
                            Batch {item.batchId}
                          </span>
                        )}
                        {isPast ? (
                          <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold">
                            Deadline Passed
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-600 line-clamp-2 max-w-2xl">
                        {item.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                          <span>Due: <strong>{formatDeadline(item.deadline)}</strong></span>
                        </span>

                        <span className="flex items-center gap-1.5 font-bold text-purple-700">
                          <UsersRound size={14} strokeWidth={1.8} aria-hidden="true" />
                          <span>{submissions.length} Submissions</span>
                        </span>

                        {item.referenceDocumentUrl && (
                          <a
                            href={item.referenceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#173B75] hover:underline font-bold"
                          >
                            <FileText size={14} strokeWidth={1.8} aria-hidden="true" />
                            <span>Reference File</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSubmissionsModalItem(item)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 px-4 py-2 text-xs font-bold text-purple-800 transition cursor-pointer"
                    >
                      <span>View Submissions ({submissions.length})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================
          CREATE ASSIGNMENT MODAL
      ==================================================== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#173B75] px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold">
                  <ClipboardList size={22} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Assignment</h3>
                  <p className="text-xs text-blue-100">Publish coursework for student submission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {modalError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600 shrink-0" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Flight Deck Crew Operations Report"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Course & Batch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Diploma / Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 font-semibold outline-none"
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Assigned Batch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBatchId}
                    onChange={(e) => setFormBatchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none"
                    required
                  >
                    {availableBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Instructions & Guidelines <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide instructions for students to complete this assignment..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Submission Deadline (Date & Time) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none"
                />
              </div>

              {/* Reference Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reference Document (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Publish Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          VIEW SUBMISSIONS MODAL
      ==================================================== */}
      {submissionsModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {submissionsModalItem.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batch: {submissionsModalItem.batchId} • Due: {formatDeadline(submissionsModalItem.deadline)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionsModalItem(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {Array.isArray(submissionsModalItem.submissions) &&
              submissionsModalItem.submissions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {submissionsModalItem.submissions.map((sub, idx) => (
                    <div
                      key={sub._id || idx}
                      className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {sub.studentName || sub.studentId?.fullName || `Student #${idx + 1}`}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {sub.studentId?.studentId || sub.studentId || ''} • Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'on time'}
                        </p>
                      </div>

                      {sub.oneDriveUrl && (
                        <a
                          href={sub.oneDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-[#173B75] hover:bg-blue-100"
                        >
                          <Download size={14} strokeWidth={1.8} aria-hidden="true" />
                          <span>Download File</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  <UsersRound size={36} strokeWidth={1.8} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
                  <p className="font-bold text-slate-800">No submissions uploaded yet.</p>
                  <p className="mt-1 text-slate-400">Student submissions will appear here once uploaded.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSubmissionsModalItem(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
