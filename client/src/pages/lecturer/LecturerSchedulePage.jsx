import { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Calendar,
} from 'lucide-react';
import { apiGet } from '../../api/http.js';

export default function LecturerSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewFilter, setViewFilter] = useState('ALL');

  const fetchSchedule = () => {
    setLoading(true);
    setError('');
    apiGet('/api/schedule')
      .then((d) => {
        setSchedules(Array.isArray(d?.schedules) ? d.schedules : []);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load class schedule.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredSchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return schedules.filter((s) => {
      if (viewFilter === 'TODAY') {
        return s.date === todayStr;
      }
      if (viewFilter === 'WEEK') {
        if (!s.date) return false;
        const sDate = new Date(s.date);
        const diffDays = (sDate - today) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      return true;
    });
  }, [schedules, viewFilter, todayStr]);

  const stats = useMemo(() => {
    const todayCount = schedules.filter((s) => s.date === todayStr).length;
    const upcomingCount = schedules.filter((s) => s.date > todayStr).length;
    return {
      total: schedules.length,
      today: todayCount,
      upcoming: upcomingCount,
    };
  }, [schedules, todayStr]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#173B75]">
              <CalendarDays size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <span>My Class Schedule</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Check your upcoming lectures, assigned classrooms, and teaching timetable.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSchedule}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.8}
            className={loading ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          <span>Refresh Timetable</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#173B75]">
            Today's Classes
          </span>
          <div className="mt-1 text-2xl font-extrabold text-[#173B75]">{stats.today}</div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Upcoming Lectures
          </span>
          <div className="mt-1 text-2xl font-extrabold text-sky-900">{stats.upcoming}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Sessions
          </span>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{stats.total}</div>
        </div>
      </div>

      {/* View Switcher Buttons */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setViewFilter('TODAY')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition cursor-pointer ${
            viewFilter === 'TODAY'
              ? 'bg-[#173B75] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Today's Classes ({stats.today})
        </button>

        <button
          type="button"
          onClick={() => setViewFilter('WEEK')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition cursor-pointer ${
            viewFilter === 'WEEK'
              ? 'bg-[#173B75] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          This Week
        </button>

        <button
          type="button"
          onClick={() => setViewFilter('ALL')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition cursor-pointer ${
            viewFilter === 'ALL'
              ? 'bg-[#173B75] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Full Timetable ({stats.total})
        </button>
      </div>

      {/* Schedule Items */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} strokeWidth={1.8} className="text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">
          <LoaderCircle size={32} strokeWidth={1.8} className="mx-auto animate-spin text-[#173B75] mb-3" aria-hidden="true" />
          <p className="font-bold text-slate-700">Loading teaching timetable...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-sm">
          <CheckCircle2 size={36} strokeWidth={1.8} className="mx-auto text-emerald-500 mb-3" aria-hidden="true" />
          <p className="text-base font-bold text-slate-800">
            {viewFilter === 'TODAY'
              ? 'No classes scheduled for today.'
              : 'No scheduled lectures found in this view.'}
          </p>
          <p className="mt-1 text-slate-400">
            Select "Full Timetable" to view all assigned sessions or contact academic management.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((s) => {
            const isToday = s.date === todayStr;
            const isPast = s.date < todayStr;

            return (
              <div
                key={s.id || s._id}
                className={`rounded-2xl border p-5 sm:p-6 transition shadow-xs ${
                  isToday
                    ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-200'
                    : isPast
                    ? 'border-slate-200 bg-slate-50/60 opacity-80'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {isToday && (
                        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Today
                        </span>
                      )}
                      {isPast && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                      {!isToday && !isPast && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Upcoming
                        </span>
                      )}

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {s.batchId ? `Batch ${s.batchId}` : 'Class'}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      {s.subject}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5">
                      <Clock size={14} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                      <span>{s.startTime} – {s.endTime}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Calendar size={14} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                    <span>{s.date}</span>
                  </span>

                  {s.room && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} strokeWidth={1.8} className="text-emerald-600" aria-hidden="true" />
                      <span>Classroom: <strong>{s.room}</strong></span>
                    </span>
                  )}

                  {s.branchId && (
                    <span className="text-slate-500">
                      Branch: {s.branchId}
                    </span>
                  )}
                </div>

                {s.notes && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                    <strong>Note:</strong> {s.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
