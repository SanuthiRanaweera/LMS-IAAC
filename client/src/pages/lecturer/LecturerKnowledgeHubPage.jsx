import { useEffect, useRef, useState } from 'react';
import { FileText, Link as LinkIcon, Video, StickyNote, Plus, Trash2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { apiGet, apiDelete, getApiBaseUrl } from '../../api/http.js';

const TYPE_ICON  = { file: FileText, link: LinkIcon, video: Video, note: StickyNote, gallery: ImageIcon };
const TYPE_COLOR = { file: 'bg-sky-50 text-sky-600', link: 'bg-purple-50 text-purple-600', video: 'bg-rose-50 text-rose-600', note: 'bg-amber-50 text-amber-600', gallery: 'bg-emerald-50 text-emerald-600' };

function mediaUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return `/${String(value).replace(/^\/+/, '')}`;
}

const emptyForm = { resourceType: 'file', title: '', description: '', contentUrl: '', textContent: '' };

export default function LecturerKnowledgeHubPage() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [listErr, setListErr]       = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [file, setFile]             = useState(null);
  const [formErr, setFormErr]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    setLoading(true); setListErr('');
    apiGet('/api/knowledge-hub')
      .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch((e) => setListErr(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(emptyForm); setFile(null); setFormErr(''); if (fileRef.current) fileRef.current.value = ''; };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onAdd = async (e) => {
    e.preventDefault(); setFormErr(''); setSubmitting(true);
    try {
      const fd = new globalThis.FormData();
      fd.append('resourceType', form.resourceType);
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description.trim());
      if (form.resourceType === 'file' && file) fd.append('file', file);
      if ((form.resourceType === 'link' || form.resourceType === 'video') && form.contentUrl) fd.append('contentUrl', form.contentUrl.trim());
      if (form.resourceType === 'note' && form.textContent) fd.append('textContent', form.textContent);

      const apiBase = await getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/knowledge-hub/lecturer`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Failed (${res.status})`);
      }
      resetForm(); setShowForm(false); load();
    } catch (err) { setFormErr(err?.message || 'Failed to add resource'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try { await apiDelete(`/api/knowledge-hub/lecturer/${id}`); load(); }
    catch (err) { globalThis.alert(err?.message || 'Failed to delete'); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Knowledge Hub</h2>
        <button onClick={() => { setShowForm((v) => !v); resetForm(); }} className="flex items-center gap-2 rounded-xl bg-[#003580] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Resource</>}
        </button>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {formErr && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{formErr}</div>}
          <form className="space-y-3" onSubmit={onAdd}>
            <div>
              <label className="text-xs font-semibold text-slate-600">Type *</label>
              <select value={form.resourceType} onChange={set('resourceType')} className={`mt-1 ${inputCls}`}>
                <option value="file">File (PDF, DOCX, PPTX…)</option>
                <option value="link">Link</option>
                <option value="video">Video link</option>
                <option value="note">Text note</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Title *</label>
              <input value={form.title} onChange={set('title')} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Description (optional)</label>
              <textarea value={form.description} onChange={set('description')} className={`mt-1 ${inputCls} resize-none`} rows={2} />
            </div>

            {form.resourceType === 'file' && (
              <div>
                <label className="text-xs font-semibold text-slate-600">File *</label>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.xlsx,.zip" onChange={(e) => setFile(e.target.files[0] || null)} className="mt-1 block w-full text-xs text-slate-600" required />
              </div>
            )}
            {(form.resourceType === 'link' || form.resourceType === 'video') && (
              <div>
                <label className="text-xs font-semibold text-slate-600">URL *</label>
                <input value={form.contentUrl} onChange={set('contentUrl')} className={`mt-1 ${inputCls}`} required placeholder="https://..." />
              </div>
            )}
            {form.resourceType === 'note' && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Note content *</label>
                <textarea value={form.textContent} onChange={set('textContent')} className={`mt-1 ${inputCls} resize-none`} rows={5} required />
              </div>
            )}

            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
              <Upload size={14} />{submitting ? 'Saving…' : 'Add Resource'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {listErr && <div className="text-sm text-rose-700 mb-3">{listErr}</div>}
        {loading ? <div className="text-sm text-slate-500">Loading…</div> : items.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">No resources yet. Add one above.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = TYPE_ICON[item.resourceType] || FileText;
              const color = TYPE_COLOR[item.resourceType] || 'bg-slate-50 text-slate-600';
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{item.resourceType} • {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <button onClick={() => onDelete(item.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100"><Trash2 size={14} /></button>
                  </div>

                  {item.description && <p className="mt-2 text-xs text-slate-600">{item.description}</p>}

                  {item.resourceType === 'gallery' && Array.isArray(item.imagePaths) && item.imagePaths.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {item.imagePaths.slice(0, 4).map((imagePath, index) => (
                        <a key={`${item.id}-${index}`} href={mediaUrl(imagePath)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <img src={mediaUrl(imagePath)} alt={item.imageNames?.[index] || `${item.title} ${index + 1}`} className="h-20 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
