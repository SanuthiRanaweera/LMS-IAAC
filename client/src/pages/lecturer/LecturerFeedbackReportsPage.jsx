import { useEffect, useState } from 'react';
import {
  MessageSquare,
  CalendarDays,
  Star,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiGet } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#003580] mb-3" aria-hidden="true" />
        <p className="font-bold text-slate-700">Loading student feedback reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#003580]">
            <MessageSquare className="h-6 w-6" aria-hidden="true" />
          </div>
          <span>Student Feedback Reports</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review anonymized weekly feedback summaries compiled and released by the college administration.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" aria-hidden="true" />
          <p className="text-base font-bold text-slate-800">No feedback reports received yet</p>
          <p className="mt-1 text-xs text-slate-400">Weekly student feedback reports will appear here once released by the Super Admin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r._id || r.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900">{r.weekRef}</span>
                  <span className="rounded-full bg-blue-50 border border-blue-200 text-[#003580] px-2.5 py-0.5 text-xs font-bold">
                    Official Report
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>Sent: {formatDate(r.sentAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-80">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Reviews</span>
                  <span className="text-lg font-extrabold text-slate-900">{r.total}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Rating</span>
                  <div className="flex items-center gap-1 text-lg font-extrabold text-slate-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                    <span>{r.averageRating}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Student Comments</h3>
                {(Array.isArray(r.entries) ? r.entries : []).map((e, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < Number(e.rating)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                        <span className="ml-1.5 text-xs font-bold text-slate-700">{e.rating} / 5</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">{e.comment}</p>
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
