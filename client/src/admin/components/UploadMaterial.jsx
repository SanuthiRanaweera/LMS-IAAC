import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CloudUpload, Loader2 } from 'lucide-react';
import { apiGet, getApiBaseUrl } from '../../api/http.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

function buildBatchOptions(branches, branchId) {
  if (!branchId) return [];

  const selectedBranch = branches.find((branch) => String(branch.id) === String(branchId));
  if (!selectedBranch) return [];

  const intakes = Array.isArray(selectedBranch.intakes) ? selectedBranch.intakes : [];
  const options = [];

  for (const intake of intakes) {
    const intakeId = String(intake.id || '');
    const intakeName = String(intake.name || 'Intake');
    const batches = Array.isArray(intake.batches) ? intake.batches : [];

    for (const batch of batches) {
      const batchId = String(batch.id || '');
      if (!batchId) continue;
      options.push({
        id: batchId,
        name: String(batch.name || batchId),
        intakeId,
        intakeName,
      });
    }
  }

  return options;
}

export default function UploadMaterial() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [course, setCourse] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const batchOptions = useMemo(() => buildBatchOptions(branches, branchId), [branches, branchId]);
  const selectedBatch = useMemo(
    () => batchOptions.find((batch) => batch.id === batchId) || null,
    [batchOptions, batchId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHierarchy() {
      setLoading(true);
      setError('');
      try {
        const response = await apiGet('/api/materials/hierarchy/full');
        if (!cancelled) {
          setBranches(Array.isArray(response?.branches) ? response.branches : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load academic hierarchy');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) return;
    if (!batchOptions.some((batch) => batch.id === batchId)) {
      setBatchId('');
    }
  }, [branchId, batchOptions, batchId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  function onDrop(event) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  }

  function onDragOver(event) {
    event.preventDefault();
  }

  function resetForm() {
    setBatchId('');
    setCourse('');
    setWeekNumber('');
    setTitle('');
    setContent('');
    setFile(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!branchId || !batchId || !course || !weekNumber || !title.trim()) {
      setError('Branch, batch, course, week, and title are required.');
      return;
    }

    if (!file && !content.trim()) {
      setError('Upload a file or provide a link/content.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('branchId', branchId);
      formData.append('batchId', batchId);
      formData.append('intakeId', selectedBatch?.intakeId || '');
      formData.append('course', course);
      formData.append('weekNumber', String(weekNumber));
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      if (file) formData.append('file', file);

      const apiBase = await getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/admin/materials`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || 'Upload failed';
        throw new Error(message);
      }

      setToast('Study material uploaded successfully.');
      resetForm();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#c8d7ee] bg-gradient-to-br from-[#00122a] via-[#002147] to-[#00315f] p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Study Material Upload</h1>
        <p className="mt-2 text-sm text-blue-100">
          Deliver materials by exact student cohort: branch, batch, course, and week.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#002147]">Branch</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
              disabled={loading}
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
            <span className="text-sm font-semibold text-[#002147]">Batch</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
              disabled={!branchId || loading}
            >
              <option value="">Select Batch</option>
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.intakeName})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#002147]">Course</span>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
            >
              <option value="">Select Course</option>
              {COURSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#002147]">Week Number</span>
            <input
              type="number"
              min={1}
              max={52}
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              placeholder="e.g. 4"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#002147]">Material Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 4 - Emergency Procedures"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-[#002147]">External Link (Optional)</span>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
            />
          </label>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="mt-5 rounded-2xl border-2 border-dashed border-[#5f88c7] bg-[#f5f9ff] p-6 text-center"
        >
          <CloudUpload className="mx-auto h-10 w-10 text-[#002147]" />
          <p className="mt-2 text-sm font-semibold text-[#002147]">Drag and drop file here</p>
          <p className="text-xs text-slate-500">PDF, PPT, DOCX and related formats supported</p>
          <input
            type="file"
            className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#002147] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <p className="mt-2 text-xs text-slate-600">Selected: {file.name}</p>}
        </div>

        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#002147] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#001736] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            {submitting ? 'Uploading...' : 'Upload Material'}
          </button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
