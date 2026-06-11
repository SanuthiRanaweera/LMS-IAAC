import { useEffect, useState } from 'react';
import { FileText, Link as LinkIcon, Video, StickyNote, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { apiGet } from '../api/http.js';

const TYPE_ICON = {
  file: FileText,
  link: LinkIcon,
  video: Video,
  note: StickyNote,
  gallery: ImageIcon,
};

const TYPE_LABEL = { file: 'File', link: 'Link', video: 'Video', note: 'Note', gallery: 'Gallery' };
const TYPE_COLOR = {
  file:  'bg-sky-50 text-sky-600',
  link:  'bg-purple-50 text-purple-600',
  video: 'bg-rose-50 text-rose-600',
  note:  'bg-amber-50 text-amber-600',
  gallery: 'bg-emerald-50 text-emerald-600',
};

function mediaUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return `/${String(value).replace(/^\/+/, '')}`;
}

export default function KnowledgeHubPage() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    apiGet('/api/knowledge-hub')
      .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error)   return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Knowledge Hub</h2>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No resources added yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.resourceType] || FileText;
            const color = TYPE_COLOR[item.resourceType] || 'bg-slate-50 text-slate-600';
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{TYPE_LABEL[item.resourceType] || item.resourceType}</span>
                    </div>
                    {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}

                    {/* Note: render inline */}
                    {item.resourceType === 'note' && item.textContent && (
                      <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-slate-700 whitespace-pre-wrap">{item.textContent}</div>
                    )}

                    {/* Link: open in new tab */}
                    {item.resourceType === 'link' && item.contentUrl && (
                      <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-sky-600 hover:underline">
                        <ExternalLink size={12} />{item.contentUrl}
                      </a>
                    )}

                    {/* Video link: embed */}
                    {item.resourceType === 'video' && item.contentUrl && (
                      <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-rose-600 hover:underline">
                        <ExternalLink size={12} />Watch video
                      </a>
                    )}

                    {/* File: download */}
                    {item.resourceType === 'file' && (
                      <a
                        href={item.downloadUrl || mediaUrl(`api/knowledge-hub/download/${item.id}`)}
                        className="mt-2 flex w-fit items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Download size={12} />{item.fileName || 'Download'}
                      </a>
                    )}

                    {item.resourceType === 'gallery' && Array.isArray(item.imagePaths) && item.imagePaths.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {item.imagePaths.slice(0, 6).map((imagePath, index) => (
                          <a key={`${item.id}-${index}`} href={mediaUrl(imagePath)} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <img src={mediaUrl(imagePath)} alt={item.imageNames?.[index] || `${item.title} ${index + 1}`} className="h-28 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                          </a>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-[10px] text-slate-400">Added by {item.addedByName}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
