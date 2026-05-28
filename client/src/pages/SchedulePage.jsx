import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/http.js';

export default function SchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    apiGet('/api/schedule')
      .then((d) => setSchedules(Array.isArray(d?.schedules) ? d.schedules : []))
      .catch((e) => setError(e?.message || 'Failed to load schedule'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading…</div>;
  if (error)   return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Class Schedule</h2>
      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No classes scheduled yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-900">{s.subject}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.startTime} – {s.endTime}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.room}</span>
                {s.lecturerName ? (
                  s.lecturerId ? (
                    <Link
                      to={`/lecturers/${encodeURIComponent(s.lecturerId)}`}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      <User className="h-3 w-3" />
                      <span className="underline decoration-slate-300 underline-offset-2">{s.lecturerName}</span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.lecturerName}</span>
                  )
                ) : null}
              </div>
              {s.notes && <p className="mt-2 text-xs text-slate-600 italic">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

