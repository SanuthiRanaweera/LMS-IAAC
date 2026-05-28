import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '../api/http.js';

function clampRating(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function LecturerProfilePage() {
  const { lecturerId } = useParams();
  const [lecturer, setLecturer] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOk, setSubmitOk] = useState('');

  const safeLecturerId = useMemo(() => String(lecturerId || '').trim(), [lecturerId]);

  const load = async () => {
    setLoading(true);
    setError('');
    setSubmitOk('');

    try {
      const d1 = await apiGet(`/api/lecturers/${encodeURIComponent(safeLecturerId)}`);
      setLecturer(d1?.lecturer || null);
      const d2 = await apiGet(`/api/feedback/student/status?lecturerId=${encodeURIComponent(safeLecturerId)}`);
      setStatus(d2 || null);
    } catch (e) {
      setError(e?.message || 'Failed to load lecturer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!safeLecturerId) {
      setLoading(false);
      setError('Lecturer not found');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeLecturerId]);

  const disabled = status?.hasSubmitted === true;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitOk('');

    const r = clampRating(rating);
    const c = String(comment || '').trim();

    if (disabled) {
      setSubmitError('You have already submitted feedback for this lecturer this week.');
      setSubmitting(false);
      return;
    }
    if (r < 1 || r > 5) {
      setSubmitError('Star rating is required.');
      setSubmitting(false);
      return;
    }
    if (!c) {
      setSubmitError('Comment is required.');
      setSubmitting(false);
      return;
    }
    if (c.length > 500) {
      setSubmitError('Comment must be 500 characters or less.');
      setSubmitting(false);
      return;
    }

    try {
      await apiPost('/api/feedback/student', { lecturerId: safeLecturerId, rating: r, comment: c });
      setSubmitOk('Feedback submitted.');
      setRating(0);
      setComment('');
      await load();
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 409) {
        setSubmitError('You have already submitted feedback for this lecturer this week.');
      } else {
        setSubmitError(e2?.message || 'Failed to submit feedback');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{lecturer?.name || 'Lecturer'}</h2>
          <div className="mt-1 text-xs text-slate-600">
            {lecturer?.subject ? <span className="mr-3">Subject: <span className="font-semibold">{lecturer.subject}</span></span> : null}
            {lecturer?.branchId ? <span>Branch: <span className="font-semibold">{lecturer.branchId}</span></span> : null}
          </div>
        </div>
        <Link
          to="/feedback"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          My Feedback History
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">Give Feedback</div>
            <div className="mt-1 text-xs text-slate-500">
              Week: <span className="font-semibold text-slate-700">{status?.weekRef || '—'}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            className={
              'rounded-lg px-3 py-2 text-xs font-semibold ' +
              (disabled
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-sky-700 text-white hover:bg-sky-800')
            }
          >
            {disabled ? 'Already submitted this week' : 'Give Feedback'}
          </button>
        </div>

        {disabled ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            You have already submitted feedback for this lecturer this week.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-700">Star rating (required)</div>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={n}
                    checked={clampRating(rating) === n}
                    onChange={() => setRating(n)}
                    className="accent-sky-700"
                  />
                  <span className="text-sm text-slate-800">{n}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">Comment (required)</div>
              <div className="text-[11px] text-slate-500">{String(comment || '').length}/500</div>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Write your feedback (max 500 characters)"
            />
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{submitError}</div>
          ) : null}
          {submitOk ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {submitOk} {status?.weekRef ? <span className="ml-1">({status.weekRef})</span> : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">Submitted feedback cannot be edited.</div>
            <button
              type="submit"
              disabled={submitting || disabled}
              className={
                'rounded-lg px-4 py-2 text-xs font-semibold ' +
                (submitting || disabled
                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                  : 'bg-sky-700 text-white hover:bg-sky-800')
              }
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <div className="font-semibold text-slate-800">Privacy</div>
        <div className="mt-1">
          Lecturers do not see raw feedback. They only receive anonymized weekly reports sent by the Super Admin.
        </div>
        {status?.weekStart ? (
          <div className="mt-2 text-[11px] text-slate-500">Week window starts: {formatDate(status.weekStart)}</div>
        ) : null}
      </div>
    </div>
  );
}
