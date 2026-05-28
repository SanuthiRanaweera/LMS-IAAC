import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function MyFeedbackHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/feedback/student/history')
      .then((d) => setItems(Array.isArray(d?.feedback) ? d.feedback : []))
      .catch((e) => setError(e?.message || 'Failed to load feedback history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Feedback History</h2>
          <div className="mt-1 text-xs text-slate-500">Only you can see your feedback entries.</div>
        </div>
        <Link
          to="/schedule"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          Back to schedule
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">{f.lecturer?.name || 'Lecturer'}</div>
                <div className="text-xs text-slate-500">Submitted: {formatDate(f.submittedAt)}</div>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                <span className="mr-3">Week: <span className="font-semibold text-slate-800">{f.weekRef}</span></span>
                <span>Rating: <span className="font-semibold text-slate-800">{f.rating}/5</span></span>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
                {f.comment}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
