import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileUp,
  Loader2,
  Send,
} from 'lucide-react';
import {
  createAssignment,
  fetchAdminAssignments,
  fetchAssignmentHierarchy,
} from '../../services/assignments.service.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

function inferCourseFromBatchName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('cabin')) return 'Cabin Crew';
  if (normalized.includes('ground')) return 'Ground Operations';
  if (normalized.includes('ticketing') || normalized.includes('reservation')) return 'Ticketing & Reservations';
  if (normalized.includes('cargo')) return 'Air Cargo';
  return '';
}

function buildBatchOptions(branches, branchId) {
  if (!branchId) return [];

  const selectedBranch = branches.find((branch) => String(branch.id) === String(branchId));
  if (!selectedBranch) return [];

  const intakes = Array.isArray(selectedBranch.intakes) ? selectedBranch.intakes : [];
  const batches = [];

  for (const intake of intakes) {
    const intakeName = String(intake.name || 'Intake');
    for (const batch of Array.isArray(intake.batches) ? intake.batches : []) {
      if (!batch?.id) continue;
      batches.push({
        id: String(batch.id),
        name: String(batch.name || batch.id),
        intakeName,
        suggestedCourse: inferCourseFromBatchName(batch.name || batch.id),
      });
    }
  }

  return batches;
}

function formatDeadline(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid deadline';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function UploadAssignment() {
  const [branches, setBranches] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [branchId, setBranchId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [referenceDocument, setReferenceDocument] = useState(null);

  const batchOptions = useMemo(() => buildBatchOptions(branches, branchId), [branches, branchId]);
  const selectedBatch = useMemo(
    () => batchOptions.find((option) => option.id === batchId) || null,
    [batchId, batchOptions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHierarchy() {
      setLoading(true);
      setError('');
      try {
        const response = await fetchAssignmentHierarchy();
        if (!cancelled) setBranches(response);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load academic hierarchy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadAssignments() {
    setListLoading(true);
    try {
      const items = await fetchAdminAssignments();
      setAssignments(items);
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    if (!batchOptions.some((option) => option.id === batchId)) {
      setBatchId('');
    }
  }, [batchId, batchOptions, branchId]);

  useEffect(() => {
    if (!selectedBatch?.suggestedCourse) return;
    setCourse((current) => (current === selectedBatch.suggestedCourse ? current : selectedBatch.suggestedCourse));
  }, [selectedBatch]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = globalThis.setTimeout(() => setToast(''), 2600);
    return () => globalThis.clearTimeout(timer);
  }, [toast]);

  function resetForm() {
    setBranchId('');
    setBatchId('');
    setCourse('');
    setTitle('');
    setDescription('');
    setDeadline('');
    setReferenceDocument(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!branchId || !batchId || !course || !title.trim() || !description.trim() || !deadline) {
      setError('Branch, batch, diploma, title, description, and deadline are required.');
      return;
    }

    setSubmitting(true);
    try {
      await createAssignment({
        branchId,
        batchId,
        course,
        title: title.trim(),
        description: description.trim(),
        deadline,
        referenceDocument,
      });
      resetForm();
      setToast('Assignment published successfully.');
      await loadAssignments();
    } catch (err) {
      setError(err.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d5deea] bg-gradient-to-br from-[#071a2f] via-[#0b2d52] to-[#0f4770] p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Assignment Management</h1>
        <p className="mt-2 max-w-3xl text-sm text-sky-100">
          Target assignments to a precise branch, batch, and diploma. Student submissions are delivered straight to OneDrive, while MongoDB stores only the submission metadata and link.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#0b2948]">Branch</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#0b2948]">Batch</span>
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={!branchId || loading}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
            >
              <option value="">Select Batch</option>
              {batchOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.intakeName})
                </option>
              ))}
            </select>
            {selectedBatch?.suggestedCourse ? (
              <span className="text-xs text-slate-500">
                This batch maps to {selectedBatch.suggestedCourse}.
              </span>
            ) : null}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#0b2948]">Diploma</span>
            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
            >
              <option value="">Select Diploma</option>
              {COURSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#0b2948]">Assignment Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Cabin Safety Case Study"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#0b2948]">Deadline</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1">
          <span className="text-sm font-semibold text-[#0b2948]">Description / Instructions</span>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add briefing notes, grading expectations, and attachment instructions."
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0b2948] focus:outline-none focus:ring-2 focus:ring-[#0b2948]/15"
          />
        </label>

        <label className="mt-4 block rounded-2xl border-2 border-dashed border-[#86a8d8] bg-[#f5f9ff] p-5 text-center">
          <FileUp className="mx-auto h-10 w-10 text-[#0b2948]" />
          <div className="mt-2 text-sm font-semibold text-[#0b2948]">Reference Document</div>
          <div className="text-xs text-slate-500">Optional PDF, DOCX, PPTX, or image for assignment instructions</div>
          <input
            type="file"
            className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0b2948] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(event) => setReferenceDocument(event.target.files?.[0] || null)}
          />
          {referenceDocument ? <p className="mt-2 text-xs text-slate-600">Selected: {referenceDocument.name}</p> : null}
        </label>

        {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b2948] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#081f36] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Publishing...' : 'Publish Assignment'}
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Submissions Dashboard</h2>
            <p className="text-sm text-slate-500">Late submissions are highlighted in red for immediate follow-up.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Clock3 className="h-4 w-4" /> Live Overview
          </div>
        </div>

        {listLoading ? (
          <div className="text-sm text-slate-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No assignments published yet.
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{assignment.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {assignment.course} • {assignment.branchId} • {assignment.batchId}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{assignment.description}</div>
                    <div className="mt-2 text-xs font-medium text-slate-500">Due {formatDeadline(assignment.deadline)}</div>
                    {assignment.referenceDocumentUrl ? (
                      <a
                        href={assignment.referenceDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800"
                      >
                        Open reference document
                      </a>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                      <div className="text-xl font-bold text-slate-900">{assignment.submissionCount}</div>
                      <div className="text-xs text-slate-500">Submissions</div>
                    </div>
                    <div className="rounded-xl bg-rose-50 px-4 py-3 shadow-sm">
                      <div className="text-xl font-bold text-rose-700">{assignment.lateSubmissionCount}</div>
                      <div className="text-xs text-rose-600">Late</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {assignment.submissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      No student submissions yet.
                    </div>
                  ) : (
                    assignment.submissions.map((submission) => {
                      const isLate = submission.status === 'Late';
                      return (
                        <div
                          key={submission.id}
                          className={[
                            'flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between',
                            isLate ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white',
                          ].join(' ')}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{submission.studentName || 'Student'}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {submission.studentCode || 'No student code'} • {submission.studentEmail || 'No email'}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">{submission.fileName}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={[
                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold',
                                isLate ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700',
                              ].join(' ')}
                            >
                              {isLate ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              {submission.status}
                            </span>

                            <a
                              href={submission.oneDriveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View File
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast ? (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}