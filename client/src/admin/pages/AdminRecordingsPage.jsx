import { useEffect, useRef, useState } from 'react';
import { Play, Plus, Upload, Video, X } from 'lucide-react';
import { apiGet, getApiBaseUrl } from '../../api/http.js';

function validateTitle(t) {
  if (!t || t.trim().length < 5) return 'Title must be at least 5 characters.';
  return '';
}

export default function AdminRecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(null); // { id, title, embedUrl | streamUrl, isEmbed }
  const videoRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [file, setFile] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_URL || '');

  const [branches, setBranches] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const loadRecordings = () => {
    let cancelled = false;
    setLoading(true);
    setError('');

    apiGet('/api/admin/recordings')
      .then((d) => {
        if (cancelled) return;
        setRecordings(Array.isArray(d?.recordings) ? d.recordings : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load recordings');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return loadRecordings();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getApiBaseUrl()
      .then((base) => {
        if (!cancelled) setApiBase(base);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/materials/hierarchy')
      .then((d) => {
        if (cancelled) return;
        setBranches(Array.isArray(d?.branches) ? d.branches : []);
      })
      .catch(() => {
        if (cancelled) return;
        setBranches([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedBranch) {
      setIntakes([]);
      setSelectedIntake('');
      return;
    }

    let cancelled = false;
    apiGet(`/api/materials/branches/${encodeURIComponent(selectedBranch)}/intakes`)
      .then((d) => {
        if (cancelled) return;
        setIntakes(Array.isArray(d?.intakes) ? d.intakes : []);
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
      .then((d) => {
        if (cancelled) return;
        setBatches(Array.isArray(d?.batches) ? d.batches : []);
      })
      .catch(() => {
        if (cancelled) return;
        setBatches([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranch, selectedIntake]);

  const resetForm = () => {
    setSelectedBranch('');
    setSelectedIntake('');
    setSelectedBatch('');
    setTitle('');
    setDesc('');
    setVideoLink('');
    setFile(null);
    setFormErr('');
    setUploadMode('file');
    if (fileRef.current) fileRef.current.value = '';
  };

  const onUpload = async (e) => {
    e.preventDefault();
    const titleErr = validateTitle(title);
    if (titleErr) {
      setFormErr(titleErr);
      return;
    }
    if (!selectedBranch) {
      setFormErr('Please select a branch.');
      return;
    }
    if (!selectedIntake) {
      setFormErr('Please select an intake.');
      return;
    }
    if (!selectedBatch) {
      setFormErr('Please select a batch.');
      return;
    }
    if (uploadMode === 'file' && !file) {
      setFormErr('Please select a video file.');
      return;
    }
    if (uploadMode === 'link' && !videoLink.trim()) {
      setFormErr('Please enter a video URL.');
      return;
    }

    setFormErr('');
    setUploading(true);
    try {
      const apiOrigin = apiBase || (await getApiBaseUrl());
      const fd = new globalThis.FormData();
      fd.append('branchId', selectedBranch);
      fd.append('intakeId', selectedIntake);
      fd.append('batchId', selectedBatch);
      fd.append('title', title.trim());
      fd.append('description', desc.trim());
      if (uploadMode === 'file') fd.append('video', file);
      else fd.append('videoLink', videoLink.trim());

      const res = await fetch(`${apiOrigin}/api/admin/recordings`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Upload failed (${res.status})`);
      }

      resetForm();
      setShowForm(false);
      loadRecordings();
    } catch (err) {
      setFormErr(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openVideo = async (rec) => {
    if (rec.videoLink) {
      try {
        const d = await apiGet(`/api/admin/recordings/stream/${rec.id}`);
        setPlaying({ id: rec.id, title: rec.title, embedUrl: d?.embedUrl || null, isEmbed: true });
      } catch {
        setPlaying({ id: rec.id, title: rec.title, embedUrl: null, isEmbed: true });
      }
      return;
    }

    const apiOrigin = apiBase || (await getApiBaseUrl());
    setPlaying({
      id: rec.id,
      title: rec.title,
      streamUrl: `${apiOrigin}/api/admin/recordings/stream/${encodeURIComponent(rec.id)}`,
      isEmbed: false,
    });
  };

  if (loading) {
    return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Recordings</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            resetForm();
          }}
          className="flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          {showForm ? (
            <>
              <X size={14} /> Close
            </>
          ) : (
            <>
              <Plus size={14} /> Add Recording
            </>
          )}
        </button>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {formErr ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{formErr}</div>
          ) : null}

          <form className="space-y-3" onSubmit={onUpload}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Branch *</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  required
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Intake *</label>
                <select
                  value={selectedIntake}
                  onChange={(e) => setSelectedIntake(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  disabled={!selectedBranch}
                  required
                >
                  <option value="">Select intake…</option>
                  {intakes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Batch *</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  disabled={!selectedBranch || !selectedIntake}
                  required
                >
                  <option value="">Select batch…</option>
                  {batches.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
                placeholder="Week 1 — Air Law — Recording"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Description (optional)</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={
                  `rounded-xl px-4 py-2 text-xs font-semibold ` +
                  (uploadMode === 'file' ? 'bg-sky-700 text-white' : 'border border-slate-300 text-slate-700')
                }
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('link')}
                className={
                  `rounded-xl px-4 py-2 text-xs font-semibold ` +
                  (uploadMode === 'link' ? 'bg-sky-700 text-white' : 'border border-slate-300 text-slate-700')
                }
              >
                Video Link
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div>
                <label className="text-xs font-semibold text-slate-600">Video file *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-600"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-600">YouTube / Vimeo URL *</label>
                <input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </section>
      )}

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
              <p className="truncate pr-4 text-sm font-semibold text-white">{playing.title}</p>
              <button type="button" onClick={() => setPlaying(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {playing.isEmbed && playing.embedUrl ? (
              <div className="aspect-video">
                <iframe
                  src={playing.embedUrl}
                  className="h-full w-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={playing.title}
                />
              </div>
            ) : playing.isEmbed ? (
              <div className="aspect-video flex items-center justify-center">
                <p className="text-sm text-slate-400">Unable to embed this video. Try opening it directly.</p>
              </div>
            ) : (
              <video ref={videoRef} src={playing.streamUrl} controls autoPlay className="aspect-video w-full bg-black" />
            )}
          </div>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No recordings found.
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Video size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                  {r.description ? <p className="truncate text-xs text-slate-500">{r.description}</p> : null}
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    By {r.uploadedByName || '—'} •{' '}
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openVideo(r)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800"
              >
                <Play size={12} /> Watch
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
