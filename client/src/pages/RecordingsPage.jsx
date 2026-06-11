import { useEffect, useRef, useState } from 'react';
import { Video, ExternalLink, Play, X } from 'lucide-react';
import { apiGet, getApiBaseUrl } from '../api/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [playing, setPlaying]       = useState(null); // { id, title, embedUrl }
  const videoRef = useRef(null);

  useEffect(() => {
    apiGet('/api/recordings')
      .then((d) => setRecordings(Array.isArray(d?.recordings) ? d.recordings : []))
      .catch((e) => setError(e?.message || 'Failed to load recordings'))
      .finally(() => setLoading(false));
  }, []);

  const openVideo = async (rec) => {
    if (rec.videoLink) {
      // External video link — get embed URL from server
      try {
        const d = await apiGet(`/api/recordings/stream/${rec.id}`);
        setPlaying({ id: rec.id, title: rec.title, embedUrl: d?.embedUrl || null, isEmbed: true });
      } catch {
        setPlaying({ id: rec.id, title: rec.title, embedUrl: null, isEmbed: true });
      }
    } else {
      // Streamed file
      const apiOrigin = API_BASE || (await getApiBaseUrl());
      setPlaying({ id: rec.id, title: rec.title, streamUrl: `${apiOrigin}/api/recordings/stream/${encodeURIComponent(rec.id)}`, isEmbed: false });
    }
  };

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error)   return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Lecture Recordings</h2>

      {/* Video player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-black shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
              <p className="text-sm font-semibold text-white truncate pr-4">{playing.title}</p>
              <button onClick={() => setPlaying(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            {playing.isEmbed && playing.embedUrl ? (
              <div className="aspect-video">
                <iframe src={playing.embedUrl} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen title={playing.title} />
              </div>
            ) : playing.isEmbed ? (
              <div className="aspect-video flex items-center justify-center">
                <p className="text-sm text-slate-400">Unable to embed this video. Try opening it directly.</p>
              </div>
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video ref={videoRef} src={playing.streamUrl} controls autoPlay className="w-full aspect-video bg-black" />
            )}
          </div>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No recordings available yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Video size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{r.title}</p>
                  {r.description && <p className="text-xs text-slate-500 truncate">{r.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">By {r.uploadedByName} • {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <button
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
