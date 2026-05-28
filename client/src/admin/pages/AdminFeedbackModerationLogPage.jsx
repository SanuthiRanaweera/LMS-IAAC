import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../../api/http.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AdminFeedbackModerationLogPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [words, setWords] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d1 = await apiGet('/api/admin/feedback/moderation/log');
      setEvents(Array.isArray(d1?.events) ? d1.events : []);
      const d2 = await apiGet('/api/admin/feedback/bad-words');
      setWords((Array.isArray(d2?.words) ? d2.words : []).join('\n'));
    } catch (e) {
      setError(e?.message || 'Failed to load moderation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const list = String(words || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      await apiPut('/api/admin/feedback/bad-words', { words: list });
      setSaveMsg('Bad-word list saved.');
    } catch (e) {
      setSaveMsg(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Moderation</h2>
          <div className="mt-1 text-xs text-slate-500">Removed feedback is logged here for audit.</div>
        </div>
        <Link
          to="/admin/feedback"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          Back to feedback
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Bad-word / hate-speech list</div>
        <div className="mt-1 text-xs text-slate-500">One term per line. Matching feedback is auto-flagged.</div>
        <textarea
          value={words}
          onChange={(e) => setWords(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
          placeholder="Add words or phrases…"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">Changes apply to new submissions.</div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={
              'rounded-lg px-3 py-2 text-xs font-semibold ' +
              (saving ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-sky-700 text-white hover:bg-sky-800')
            }
          >
            {saving ? 'Saving…' : 'Save list'}
          </button>
        </div>
        {saveMsg ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{saveMsg}</div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Moderation log</div>

        {events.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No moderation actions yet.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-800">{e.action}</div>
                  <div className="text-[11px] text-slate-500">{formatDate(e.at)}</div>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  By: <span className="font-semibold text-slate-800">{e.actor?.name || 'Admin'}</span> ({e.actor?.role || ''})
                </div>

                {e.feedback ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    <div>
                      Student: <span className="font-semibold">{e.feedback.student?.name}</span> ({e.feedback.student?.studentId})
                    </div>
                    <div>Lecturer: <span className="font-semibold">{e.feedback.lecturer?.name}</span></div>
                    <div>Week: <span className="font-semibold">{e.feedback.weekRef}</span></div>
                    <div>Rating: <span className="font-semibold">{e.feedback.rating}/5</span></div>
                    <div className="mt-2 text-sm text-slate-800">{e.feedback.comment}</div>
                  </div>
                ) : null}

                {e.reason ? (
                  <div className="mt-2 text-xs text-slate-600">Reason: {e.reason}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
