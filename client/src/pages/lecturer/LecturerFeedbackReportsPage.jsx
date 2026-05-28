import { useEffect, useState } from 'react';
import { apiGet } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function LecturerFeedbackReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/feedback/lecturer/reports')
      .then((d) => setReports(Array.isArray(d?.reports) ? d.reports : []))
      .catch((e) => setError(e?.message || 'Failed to load feedback reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Feedback Reports</h2>
        <div className="mt-1 text-xs text-slate-500">
          You only receive anonymized weekly reports sent by the Super Admin.
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No feedback reports received yet.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id || r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">{r.weekRef}</div>
                <div className="text-xs text-slate-500">Sent: {formatDate(r.sentAt)}</div>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                <span className="mr-3">Total: <span className="font-semibold text-slate-800">{r.total}</span></span>
                <span>Average rating: <span className="font-semibold text-slate-800">{r.averageRating}</span></span>
              </div>

              <div className="mt-4 space-y-2">
                {(Array.isArray(r.entries) ? r.entries : []).map((e, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-600">Rating: <span className="font-semibold text-slate-800">{e.rating}/5</span></div>
                    <div className="mt-2 text-sm text-slate-800">{e.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
