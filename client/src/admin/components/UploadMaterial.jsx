import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CloudUpload, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { apiDelete, apiGet, apiPut, getApiBaseUrl } from '../../api/http.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

function joinApiUrl(base, path) {
  const normalizedBase = String(base || '').replace(/\/$/, '');
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;

  if (!normalizedBase) return normalizedPath;

  if (normalizedBase.endsWith('/api') && normalizedPath === '/api') {
    return normalizedBase;
  }

  if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

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

    if (batches.length === 0 && intakeId) {
      options.push({
        id: `__intake__:${intakeId}`,
        name: 'All Students',
        intakeId,
        intakeName,
        isIntakeLevel: true,
      });
      continue;
    }

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
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState('');
  const [editingId, setEditingId] = useState('');

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

  async function loadMaterials() {
    setMaterialsLoading(true);
    setMaterialsError('');
    try {
      const response = await apiGet('/api/materials/admin?limit=50');
      setMaterials(Array.isArray(response?.materials) ? response.materials : []);
    } catch (err) {
      setMaterialsError(err.message || 'Failed to load study materials');
    } finally {
      setMaterialsLoading(false);
    }
  }

  useEffect(() => {
    void loadMaterials();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    if (!batchOptions.some((batch) => batch.id === batchId)) {
      setBatchId('');
    }
  }, [branchId, batchOptions, batchId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = globalThis.setTimeout(() => setToast(''), 2800);
    return () => globalThis.clearTimeout(timer);
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
    setEditingId('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!branchId || !selectedBatch?.intakeId || !course || !weekNumber || !title.trim()) {
      setError('Branch, intake or batch, course, week, and title are required.');
      return;
    }

    const resolvedBatchId = selectedBatch?.isIntakeLevel ? '' : batchId;

    if (!editingId && !file && !content.trim()) {
      setError('Upload a file or provide a link/content.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await apiPut(`/api/materials/admin/${editingId}`, {
          branchId,
          batchId: resolvedBatchId,
          intakeId: selectedBatch?.intakeId || '',
          course,
          weekNumber: String(weekNumber),
          title: title.trim(),
          description: content.trim(),
          content: content.trim(),
          category: 'Study Material',
          isActive: true,
        });
      } else {
        const formData = new globalThis.FormData();
        formData.append('branchId', branchId);
        formData.append('batchId', resolvedBatchId);
        formData.append('intakeId', selectedBatch?.intakeId || '');
        formData.append('course', course);
        formData.append('weekNumber', String(weekNumber));
        formData.append('title', title.trim());
        formData.append('content', content.trim());
        if (file) formData.append('file', file);

        const apiBase = await getApiBaseUrl();
        const response = await fetch(joinApiUrl(apiBase, '/api/materials/upload'), {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const validationErrors = Array.isArray(payload?.errors) ? payload.errors.filter(Boolean) : [];
          const message = validationErrors.length > 0
            ? validationErrors.join(' ')
            : (payload?.message || 'Upload failed');
          throw new Error(message);
        }
      }

      setToast(editingId ? 'Study material updated successfully.' : 'Study material uploaded successfully.');
      resetForm();
      await loadMaterials();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(material) {
    setEditingId(material.id);
    setBranchId(material.branchId || '');
    setBatchId(material.batchId || (material.intakeId ? `__intake__:${material.intakeId}` : ''));
    setCourse(material.course || '');
    setWeekNumber(material.weekNumber ? String(material.weekNumber) : '');
    setTitle(material.title || '');
    setContent(material.content || material.description || '');
    setFile(null);
    setError('');
  }

  async function handleDelete(materialId) {
    if (!globalThis.confirm('Delete this study material?')) return;

    try {
      await apiDelete(`/api/materials/admin/${materialId}`);
      setToast('Study material deleted successfully.');
      if (editingId === materialId) {
        resetForm();
      }
      await loadMaterials();
    } catch (err) {
      setMaterialsError(err.message || 'Failed to delete study material');
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#c8d7ee] bg-gradient-to-br from-[#00122a] via-[#002147] to-[#00315f] p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Study Material Upload</h1>
        <p className="mt-2 text-sm text-blue-100">
          Deliver materials by exact student cohort: branch, intake or batch, course, and week.
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
            <span className="text-sm font-semibold text-[#002147]">Batch / Intake Cohort</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#002147] focus:outline-none focus:ring-2 focus:ring-[#002147]/20"
              disabled={!branchId || loading}
            >
              <option value="">Select Batch or Intake</option>
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.isIntakeLevel ? `${batch.intakeName} (All Students)` : `${batch.name} (${batch.intakeName})`}
                </option>
              ))}
            </select>
            {!loading && branchId && batchOptions.length === 0 ? (
              <span className="text-xs text-slate-500">No intake or batch found for this branch yet.</span>
            ) : null}
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
              placeholder="Emergency Procedures"
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
          <div className="flex items-center gap-3">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Cancel Edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#002147] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#001736] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {submitting ? (editingId ? 'Saving...' : 'Uploading...') : (editingId ? 'Save Changes' : 'Upload Material')}
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Uploaded Materials</h2>
          <p className="text-sm text-slate-500">Manage the study materials shown on admin and student dashboards.</p>
        </div>

        {materialsError ? <div className="mb-4 text-sm text-rose-600">{materialsError}</div> : null}

        {materialsLoading ? (
          <div className="text-sm text-slate-500">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-sm text-slate-500">No study materials uploaded yet.</div>
        ) : (
          <div className="space-y-3">
            {materials.map((material) => (
              <div key={material.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">{material.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {material.course || 'No course'} {material.weekNumber ? `• Week ${material.weekNumber}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {material.branchId} • {material.intakeId || 'No intake'} • {material.batchId || 'All students in intake'}
                  </div>
                  {material.description ? (
                    <p className="mt-2 text-sm text-slate-600">{material.description}</p>
                  ) : null}
                  <div className="mt-2 text-xs text-slate-400">
                    {material.fileName || 'Link content'} {material.uploadedBy ? `• Uploaded by ${material.uploadedBy}` : ''}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(material)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(material.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
