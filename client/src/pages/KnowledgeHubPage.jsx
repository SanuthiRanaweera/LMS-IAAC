import { useEffect, useState } from 'react';
import { FileText, Link as LinkIcon, Video, StickyNote, Download, ExternalLink, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { apiGet } from '../api/http.js';

const TYPE_ICON = {
  file: FileText,
  link: LinkIcon,
  video: Video,
  note: StickyNote,
  gallery: ImageIcon,
};

const TYPE_LABEL = { file: 'Document', link: 'External Link', video: 'Video Lesson', note: 'Study Note', gallery: 'Media Gallery' };
const TYPE_COLOR = {
  file:  'bg-sky-100 text-sky-700 border-sky-200',
  link:  'bg-purple-100 text-purple-700 border-purple-200',
  video: 'bg-rose-100 text-rose-700 border-rose-200',
  note:  'bg-amber-100 text-amber-700 border-amber-200',
  gallery: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    apiGet('/api/knowledge-hub')
      .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch((e) => setError(e?.message || 'Failed to load resources'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#002147]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Knowledge Hub</h2>
          <p className="mt-1 text-sm text-slate-500">Explore articles, galleries, and study resources.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-slate-50 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <LayoutGrid size={28} className="text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-700">No resources available yet</p>
          <p className="mt-1 text-sm text-slate-500">Check back later for new academic materials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.resourceType] || FileText;
            const badgeStyle = TYPE_COLOR[item.resourceType] || 'bg-slate-100 text-slate-700 border-slate-200';
            const isGallery = item.resourceType === 'gallery' && Array.isArray(item.imagePaths) && item.imagePaths.length > 0;
            const coverImage = isGallery ? mediaUrl(item.imagePaths[0]) : null;

            return (
              <div 
                key={item.id} 
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {/* 1. Feature Image Header (If Gallery) */}
                {isGallery ? (
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={coverImage}
                      alt={item.title}
                      className="h-full w-full object-contain bg-slate-100 p-1 transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-4 left-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${badgeStyle} bg-white/90`}>
                        <Icon size={12} />
                        {TYPE_LABEL[item.resourceType]}
                        {item.imagePaths.length > 1 && ` (+${item.imagePaths.length - 1})`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                      <Icon size={12} />
                      {TYPE_LABEL[item.resourceType]}
                    </span>
                  </div>
                )}

                {/* 2. Content Body */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-2 text-lg font-bold leading-tight text-slate-900 line-clamp-2">
                    {item.title}
                  </h3>
                  
                  {/* Clamped description prevents the massive wall of text */}
                  {(item.description || item.textContent) && (
                    <p className="mb-6 text-sm leading-relaxed text-slate-600 line-clamp-3">
                      {item.description || item.textContent}
                    </p>
                  )}

                  {/* 3. Footer Actions (Pushed to bottom using mt-auto) */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    
                    {/* Dynamic Action Button based on type */}
                    <div className="flex-1">
                      {item.resourceType === 'link' && item.contentUrl && (
                        <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#002147] hover:text-sky-600 transition-colors">
                          Visit Link <ExternalLink size={14} />
                        </a>
                      )}

                      {item.resourceType === 'video' && item.contentUrl && (
                        <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors">
                          Watch Video <ExternalLink size={14} />
                        </a>
                      )}

                      {item.resourceType === 'file' && (
                        <a href={item.downloadUrl || mediaUrl(`api/knowledge-hub/download/${item.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-700">
                          <Download size={14} /> Download File
                        </a>
                      )}

                      {(item.resourceType === 'gallery' || item.resourceType === 'note') && (
                        <button
                          type="button"
                          onClick={() => setActivePost(item)}
                          className="text-sm font-bold text-[#002147] hover:text-sky-600 transition-colors"
                        >
                          Read Full Post &rarr;
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">
                      By {item.addedByName || 'Admin'}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {TYPE_LABEL[activePost.resourceType] || activePost.resourceType}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{activePost.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] space-y-4 overflow-y-auto px-6 py-5">
              {activePost.description && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{activePost.description}</p>
                </div>
              )}

              {activePost.resourceType === 'note' && activePost.textContent && (
                <div className="whitespace-pre-wrap break-words rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-slate-700">
                  {activePost.textContent}
                </div>
              )}

              {activePost.resourceType === 'gallery' && Array.isArray(activePost.imagePaths) && activePost.imagePaths.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activePost.imagePaths.map((imagePath, index) => (
                    <a
                      key={`${activePost.id}-${index}`}
                      href={mediaUrl(imagePath)}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-slate-200 bg-slate-100 p-2"
                    >
                      <img
                        src={mediaUrl(imagePath)}
                        alt={activePost.imageNames?.[index] || `${activePost.title} ${index + 1}`}
                        className="max-h-[60vh] w-full rounded-xl object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                    </a>
                  ))}
                </div>
              )}

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Added by {activePost.addedByName || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}