import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import { apiDelete, apiGet } from '../../api/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

function mediaUrl(value) {
  if (!value) return '';
  return `${API_BASE}/${String(value).replace(/^\/+/, '')}`;
}

function fileLabel(files) {
  if (!files.length) return 'No images selected';
  if (files.length === 1) return files[0].name;
  return `${files.length} images selected`;
}

export default function AdminKnowledgeHubPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const loadItems = () => {
    setLoading(true);
    setListErr('');
    apiGet('/api/admin/knowledge-hub')
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch((err) => setListErr(err?.message || 'Failed to load knowledge hub posts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    apiGet('/api/materials/hierarchy')
      .then((data) => setBranches(Array.isArray(data?.branches) ? data.branches : []))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (!selectedBranch) {
      setIntakes([]);
      setSelectedIntake('');
      return;
    }

    let cancelled = false;
    apiGet(`/api/materials/branches/${encodeURIComponent(selectedBranch)}/intakes`)
      .then((data) => {
        if (cancelled) return;
        setIntakes(Array.isArray(data?.intakes) ? data.intakes : []);
      })
      .catch(() => {
        if (cancelled) return;
        setIntakes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranch]);

  useEffect(() => {
    if (!selectedBranch || !selectedIntake) {
      setBatches([]);
      setSelectedBatch('');
      return;
    }

    let cancelled = false;
    apiGet(
      `/api/materials/branches/${encodeURIComponent(selectedBranch)}/intakes/${encodeURIComponent(selectedIntake)}/batches`
    )
      .then((data) => {
        if (cancelled) return;
        setBatches(Array.isArray(data?.batches) ? data.batches : []);
      })
      .catch(() => {
        if (cancelled) return;
        setBatches([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranch, selectedIntake]);

  useEffect(() => {
    const next = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(next);
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const resetForm = () => {
    setSelectedBranch('');
    setSelectedIntake('');
    setSelectedBatch('');
    setTitle('');
    setDescription('');
    setImages([]);
    setFormErr('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const onImageChange = (event) => {
    const nextFiles = Array.from(event.target.files || []).slice(0, 6);
    setImages(nextFiles);
  };

  const onCreate = async (event) => {
    event.preventDefault();
    if (!selectedBranch) return setFormErr('Please select a branch.');
    if (!selectedIntake) return setFormErr('Please select an intake.');
    if (!selectedBatch) return setFormErr('Please select a batch.');
    if (!title.trim()) return setFormErr('Title is required.');
    if (!description.trim()) return setFormErr('Description is required.');
    if (images.length === 0) return setFormErr('Please add at least one image.');

    setSaving(true);
    setFormErr('');

    try {
      const formData = new FormData();
      formData.append('resourceType', 'gallery');
      formData.append('branchId', selectedBranch);
      formData.append('intakeId', selectedIntake);
      formData.append('batchId', selectedBatch);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      images.forEach((file) => formData.append('images', file));

      const response = await fetch(`${API_BASE}/api/admin/knowledge-hub`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Failed to publish (${response.status})`);
      }

      resetForm();
      setShowForm(false);
      loadItems();
    } catch (err) {
      setFormErr(err?.message || 'Failed to publish post');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this knowledge hub post?')) return;
    try {
      await apiDelete(`/api/admin/knowledge-hub/${id}`);
      loadItems();
    } catch (err) {
      alert(err?.message || 'Failed to delete post');
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-[#003580] to-sky-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">Admin publishing</p>
            <h2 className="mt-2 text-2xl font-bold">Knowledge Hub</h2>
            <p className="mt-2 max-w-2xl text-sm text-sky-100">
              Publish image-rich posts for a selected branch, intake, and batch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value);
              if (showForm) {
                resetForm();
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {showForm ? <><X size={14} /> Close form</> : <><Plus size={14} /> New post</>}
          </button>
        </div>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {formErr && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formErr}</div>}
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onCreate}>
            <div>
              <label className="text-xs font-semibold text-slate-600">Branch *</label>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={`mt-1 ${inputCls}`} required>
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id ?? branch.name} value={branch.id ?? branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Intake *</label>
              <select value={selectedIntake} onChange={(e) => setSelectedIntake(e.target.value)} className={`mt-1 ${inputCls}`} required disabled={!selectedBranch}>
                <option value="">Select intake</option>
                {intakes.map((intake) => (
                  <option key={intake.id ?? intake.name} value={intake.id ?? intake.name}>
                    {intake.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Batch *</label>
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className={`mt-1 ${inputCls}`} required disabled={!selectedIntake}>
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id ?? batch.name} value={batch.id ?? batch.name}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} required placeholder="Week 3 highlights" />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${inputCls} min-h-28 resize-y`} required placeholder="Write the summary that students should read with the images." />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Images *</label>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onImageChange} className="mt-1 block w-full text-sm text-slate-600" />
              <p className="mt-1 text-xs text-slate-500">Up to 6 images. JPG, PNG, WebP, or GIF.</p>
              <p className="mt-2 text-xs font-medium text-slate-700">{fileLabel(images)}</p>
            </div>

            {previewUrls.length > 0 && (
              <div className="md:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {previewUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={url} alt={images[index]?.name || `Preview ${index + 1}`} className="h-32 w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="md:col-span-2 flex items-center gap-3">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
                <Upload size={14} /> {saving ? 'Publishing…' : 'Publish post'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Published posts</h3>
            <p className="text-xs text-slate-500">Visible to the matching batch in the student Knowledge Hub.</p>
          </div>
          <button type="button" onClick={loadItems} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
        </div>

        {listErr && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{listErr}</div>}
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No posts yet. Publish the first gallery above.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                {Array.isArray(item.imagePaths) && item.imagePaths.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 bg-slate-200">
                    {item.imagePaths.slice(0, 4).map((imagePath, index) => (
                      <img
                        key={`${item.id}-${index}`}
                        src={mediaUrl(imagePath)}
                        alt={item.imageNames?.[index] || `${item.title} ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400">
                    <ImageIcon size={28} />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">{item.resourceType}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.branchId}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.intakeId}</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{item.batchId}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}