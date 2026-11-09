import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FileText,
  FileUp,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  LoaderCircle,
} from 'lucide-react';
import { apiGet, apiDelete, getApiBaseUrl } from '../../api/http.js';

const COURSES = [
  'Cabin Crew',
  'Ground Operations',
  'Ticketing & Reservations',
  'Air Cargo',
];

export default function LecturerMaterialsPage() {
  const { lecturer } = useOutletContext() || {};

  const [materials, setMaterials] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Upload form state
  const [formBranchId, setFormBranchId] = useState('');
  const [formIntakeId, setFormIntakeId] = useState('');
  const [formBatchId, setFormBatchId] = useState('');
  const [formCourse, setFormCourse] = useState(COURSES[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWeekNumber, setFormWeekNumber] = useState(1);
  const [formFile, setFormFile] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [hRes, mRes] = await Promise.allSettled([
        apiGet('/api/materials/hierarchy/full'),
        apiGet('/api/materials/admin'),
      ]);

      if (hRes.status === 'fulfilled' && Array.isArray(hRes.value?.branches)) {
        setHierarchy(hRes.value.branches);
        if (!formBranchId && hRes.value.branches.length > 0) {
          const firstBranch = hRes.value.branches[0];
          setFormBranchId(lecturer?.branchId || firstBranch.id);
          const firstIntake = firstBranch.intakes?.[0];
          if (firstIntake) {
            setFormIntakeId(lecturer?.intakeId || firstIntake.id);
            const firstBatch = firstIntake.batches?.[0];
            if (firstBatch) setFormBatchId(lecturer?.batchId || firstBatch.id);
          }
        }
      }

      if (mRes.status === 'fulfilled' && Array.isArray(mRes.value?.materials)) {
        setMaterials(mRes.value.materials);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load study materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableIntakes = useMemo(() => {
    const branch = hierarchy.find((b) => String(b.id) === String(formBranchId));
    return Array.isArray(branch?.intakes) ? branch.intakes : [];
  }, [hierarchy, formBranchId]);

  const availableBatches = useMemo(() => {
    const intake = availableIntakes.find((i) => String(i.id) === String(formIntakeId));
    return Array.isArray(intake?.batches) ? intake.batches : [];
  }, [availableIntakes, formIntakeId]);

  const handleBranchChange = (newBranchId) => {
    setFormBranchId(newBranchId);
    const branch = hierarchy.find((b) => String(b.id) === String(newBranchId));
    const firstIntake = branch?.intakes?.[0];
    if (firstIntake) {
      setFormIntakeId(firstIntake.id);
      setFormBatchId(firstIntake.batches?.[0]?.id || '');
    } else {
      setFormIntakeId('');
      setFormBatchId('');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!formTitle.trim()) {
      setUploadError('Please enter a clear title for the study material.');
      return;
    }
    if (!formFile) {
      setUploadError('Please select a file to upload (PDF, PPTX, DOCX, or Image).');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('course', formCourse);
      formData.append('branchId', formBranchId || lecturer?.branchId || 'main');
      formData.append('intakeId', formIntakeId || lecturer?.intakeId || 'general');
      formData.append('batchId', formBatchId || lecturer?.batchId || '');
      formData.append('weekNumber', String(formWeekNumber || 1));
      if (formDescription.trim()) formData.append('description', formDescription.trim());
      formData.append('file', formFile);

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/materials/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.message || 'Failed to upload study material.');
      }

      setSuccessMessage('Study material uploaded successfully. It is now accessible to students.');
      setUploadModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormFile(null);
      loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Please check your file and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await apiDelete(`/api/materials/admin/${item._id || item.id}`);
      setSuccessMessage('Material deleted successfully.');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err?.message || 'Failed to delete material.');
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedCourseFilter !== 'ALL' && m.course !== selectedCourseFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          m.title?.toLowerCase().includes(q) ||
          m.fileName?.toLowerCase().includes(q) ||
          m.course?.toLowerCase().includes(q) ||
          m.batchId?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [materials, selectedCourseFilter, search]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#173B75]">
              <FileText size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <span>Study Materials</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload lecture notes, presentations, and learning resources for your students.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setUploadError('');
            setUploadModalOpen(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 transition cursor-pointer self-start sm:self-auto"
        >
          <FileUp size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Upload Study Material</span>
        </button>
      </div>

      {/* Success Notification */}
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

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search size={18} strokeWidth={1.8} className="text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search materials by title, batch, or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">All Courses</option>
            {COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw
              size={16}
              strokeWidth={1.8}
              className={loading ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Materials List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="p-4 text-xs font-semibold text-rose-700 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
            <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-[#173B75] mb-3" aria-hidden="true" />
            <p className="font-bold text-slate-700">Loading materials list...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <FileText size={36} strokeWidth={1.8} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
            <p className="text-base font-bold text-slate-800">No study materials uploaded yet</p>
            <p className="mt-1 text-slate-400">
              Click the "Upload Study Material" button above to add notes for your students.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMaterials.map((item) => (
              <div
                key={item._id || item.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#173B75]">
                    <FileText size={22} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                        {item.course}
                      </span>
                      {item.batchId && (
                        <span className="rounded-md bg-blue-50 text-[#173B75] px-2.5 py-0.5 font-bold">
                          Batch {item.batchId}
                        </span>
                      )}
                      <span>• Week {item.weekNumber || 1}</span>
                      {item.fileName && (
                        <span className="font-mono text-slate-400 truncate max-w-xs">
                          {item.fileName}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1.5 text-xs text-slate-600 italic">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    >
                      <Download size={16} strokeWidth={1.8} aria-hidden="true" />
                      <span>Download</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteMaterial(item)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    title="Delete material"
                  >
                    <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================
          UPLOAD STUDY MATERIAL MODAL (Numbered Steps)
      ==================================================== */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#173B75] px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold">
                  <FileUp size={22} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Study Material</h3>
                  <p className="text-xs text-blue-100">Publish academic materials for students</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
                aria-label="Close upload modal"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600 shrink-0" aria-hidden="true" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Step 1: Select Diploma */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Step 1: Select Diploma / Course <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 font-semibold focus:border-blue-500 outline-none"
                  required
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Branch & Batch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Step 2: Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    {hierarchy.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Batch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formBatchId}
                    onChange={(e) => setFormBatchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none"
                  >
                    <option value="">All Students / Batches</option>
                    {availableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name || batch.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3: Material Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Step 3: Enter Material Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Aviation Safety Regulations Lecture 03"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Step 4: Week Number & Optional Note */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Week Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={formWeekNumber}
                    onChange={(e) => setFormWeekNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Brief Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Read chapters 4-5 before next lecture"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Step 5: Choose File */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Step 5: Choose File <span className="text-rose-500">*</span>
                </label>
                <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-blue-400 transition bg-slate-50">
                  <input
                    type="file"
                    required
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#173B75] file:text-white hover:file:bg-blue-900 cursor-pointer"
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    Supported formats: PDF, PPTX, DOCX, Images (Max 100MB)
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <FileUp size={16} strokeWidth={1.8} aria-hidden="true" />
                      <span>Upload Material</span>
                    </>
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
