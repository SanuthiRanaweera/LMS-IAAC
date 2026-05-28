import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../../api/http.js';

function safe(v) {
  return typeof v === 'string' ? v : '';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AdminFeedbackDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const [lecturerId, setLecturerId] = useState('');
  const [weekId, setWeekId] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [ratingMax, setRatingMax] = useState('');
  const [status, setStatus] = useState('active');

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk, setSendOk] = useState('');

  const query = useMemo(() => {
    const parts = [];
    if (lecturerId) parts.push(`lecturerId=${encodeURIComponent(lecturerId)}`);
    if (weekId) parts.push(`weekId=${encodeURIComponent(weekId)}`);
    if (ratingMin) parts.push(`ratingMin=${encodeURIComponent(ratingMin)}`);
    if (ratingMax) parts.push(`ratingMax=${encodeURIComponent(ratingMax)}`);
    if (status) parts.push(`status=${encodeURIComponent(status)}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [lecturerId, ratingMin, ratingMax, status, weekId]);

  const load = () => {
    setLoading(true);
    setError('');
    apiGet(`/api/admin/feedback${query}`)
      .then((d) => setItems(Array.isArray(d?.feedback) ? d.feedback : []))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setError("You don't have permission to access feedback. Please contact your super admin.");
        } else {
          setError(e?.message || 'Failed to load feedback');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onFlag = async (id) => {
    try {
      await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}/flag`, { flagged: true, reason: 'Manual review' });
      load();
    } catch (e) {
      setError(e?.message || 'Failed to flag feedback');
    }
  };

  const onUnflag = async (id) => {
    try {
      await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}/flag`, { flagged: false });
      load();
    } catch (e) {
      setError(e?.message || 'Failed to unflag feedback');
    }
  };

  const onRemove = async (id) => {
    const reason = window.prompt('Reason for removal (optional):') || '';
    try {
      await apiDelete(`/api/admin/feedback/${encodeURIComponent(id)}?reason=${encodeURIComponent(reason)}`);
      load();
    } catch (e) {
      setError(e?.message || 'Failed to remove feedback');
    }
  };

  const average = useMemo(() => {
    const active = items.filter((x) => x.status === 'active');
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, x) => acc + (Number(x.rating) || 0), 0);
    return Math.round((sum / active.length) * 100) / 100;
  }, [items]);

  const onSendReport = async () => {
    setSending(true);
    setSendError('');
    setSendOk('');

    if (!lecturerId || !weekId) {
      setSendError('Select a lecturer and weekId to send a report.');
      setSending(false);
      return;
    }

    try {
      const res = await apiPost('/api/admin/feedback/reports', { lecturerId, weekId });
      const weekRef = res?.report?.weekRef || weekId;
      setSendOk(`Report sent (${weekRef}).`);
    } catch (e) {
      setSendError(e?.message || 'Failed to send report');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Weekly Feedback</h2>
          <div className="mt-1 text-xs text-slate-500">Super Admin can view, moderate, and send anonymized reports.</div>
        </div>
        <Link
          to="/admin/feedback/moderation"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          Moderation log
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="text-xs font-semibold text-slate-700">Lecturer ID</div>
            <input
              value={lecturerId}
              onChange={(e) => setLecturerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
              placeholder="ObjectId"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">Week ID</div>
            <input
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
              placeholder="2026-W20"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">Rating min</div>
            <input
              value={ratingMin}
              onChange={(e) => setRatingMin(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
              placeholder="1"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">Rating max</div>
            <input
              value={ratingMax}
              onChange={(e) => setRatingMax(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
              placeholder="5"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="removed">Removed</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-800">{items.length}</span> entries · Avg (active):{' '}
            <span className="font-semibold text-slate-800">{average}</span>
          </div>
          <button
            type="button"
            onClick={onSendReport}
            disabled={sending || !lecturerId || !weekId}
            className={
              'rounded-lg px-3 py-2 text-xs font-semibold ' +
              (sending || !lecturerId || !weekId
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-sky-700 text-white hover:bg-sky-800')
            }
          >
            {sending ? 'Sending…' : 'Send Report to Lecturer'}
          </button>
        </div>

        {sendError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{sendError}</div>
        ) : null}
        {sendOk ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{sendOk}</div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-500 p-4">Loading…</div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{safe(f.lecturer?.name) || 'Lecturer'} · {f.weekRef}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Student: <span className="font-semibold text-slate-800">{safe(f.student?.name)}</span> ({safe(f.student?.studentId)})
                  </div>
                  <div className="mt-1 text-xs text-slate-600">Rating: <span className="font-semibold text-slate-800">{f.rating}/5</span></div>
                  <div className="mt-1 text-[11px] text-slate-500">Submitted: {formatDate(f.submittedAt)}</div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {f.flagged ? (
                    <button
                      type="button"
                      onClick={() => onUnflag(f.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Unflag
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onFlag(f.id)}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Flag
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{f.comment}</div>

              {f.status === 'removed' ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  Removed: <span className="font-semibold">{formatDate(f.removedAt)}</span> · Reason: {f.removedReason || '—'}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
