import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  FileText,
  FileUp,
  CircleUserRound,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  LoaderCircle,
  Eye,
} from 'lucide-react';
import { apiGet } from '../../api/http.js';

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDateFriendly(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function LecturerDashboardPage() {
  const { lecturer } = useOutletContext() || {};
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = () => {
    setLoading(true);
    setError('');
    apiGet('/api/lecturers/me/dashboard')
      .then((data) => setDashboardData(data))
      .catch((err) => {
        setError(err?.message || 'Unable to load dashboard information. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const lecturerName = lecturer?.name || dashboardData?.lecturer?.name || 'Lecturer';
  const firstName = lecturerName.split(' ')[0] || 'Lecturer';
  const greeting = getGreeting();
  const todayFormatted = formatDateFriendly();

  const stats = dashboardData?.stats || {
    classesCount: 0,
    materialsCount: 0,
    assignmentsCount: 0,
  };

  const todayActivities = dashboardData?.todayActivities || {
    todayClasses: [],
    upcomingClasses: [],
    recentAssignments: [],
  };

  const nextClass =
    todayActivities.todayClasses?.[0] || todayActivities.upcomingClasses?.[0] || null;

  return (
    <div className="space-y-8 font-sans">
      {/* ====================================================
          1. DASHBOARD HEADER & WELCOME BANNER (NO EMOJIS)
      ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#173B75] via-[#002660] to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-300">
              <CalendarDays size={16} strokeWidth={1.8} className="text-sky-400" aria-hidden="true" />
              <span>{todayFormatted}</span>
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {greeting}, {firstName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm sm:text-base text-sky-100/90 leading-relaxed">
              Welcome to your IAAC Lecturer Portal. Manage your classes, students, learning materials,
              assignments, and examination results.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                <ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" />
                Role: Lecturer
              </span>
              {lecturer?.subject && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 px-3 py-1 text-xs font-semibold text-sky-200">
                  <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
                  Subject: {lecturer.subject}
                </span>
              )}
              {lecturer?.batchId && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Batch: {lecturer.batchId}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/lecturer/profile')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
            >
              <CircleUserRound size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>My Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error / Recovery Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} strokeWidth={1.8} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">Unable to Load Dashboard Data</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* ====================================================
          2. DASHBOARD SUMMARY CARDS (4 Large Cards)
      ==================================================== */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Academic Overview
          </h2>
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173B75] hover:underline cursor-pointer"
          >
            <RefreshCw
              size={14}
              strokeWidth={1.8}
              className={loading ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            <span>Refresh Overview</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: My Classes */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                My Classes
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-[#173B75]">
                <BookOpen size={24} strokeWidth={1.8} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-extrabold text-slate-900">
              {loading ? (
                <LoaderCircle size={24} className="animate-spin text-slate-400" aria-hidden="true" />
              ) : (
                stats.classesCount
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Scheduled lectures & sessions</p>
            <button
              type="button"
              onClick={() => navigate('/lecturer/schedule')}
              className="mt-5 w-full rounded-lg bg-blue-50 py-2.5 text-xs font-bold text-[#173B75] hover:bg-blue-100 transition cursor-pointer"
            >
              View My Classes
            </button>
          </div>

          {/* Card 2: Study Materials */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Study Materials
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <FileText size={24} strokeWidth={1.8} className="text-sky-700" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-extrabold text-slate-900">
              {loading ? (
                <LoaderCircle size={24} className="animate-spin text-slate-400" aria-hidden="true" />
              ) : (
                stats.materialsCount ?? 0
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Lecture notes & study resources</p>
            <button
              type="button"
              onClick={() => navigate('/lecturer/materials')}
              className="mt-5 w-full rounded-lg bg-sky-50 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition cursor-pointer"
            >
              Manage Materials
            </button>
          </div>

          {/* Card 3: My Assignments */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                My Assignments
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <ClipboardList size={24} strokeWidth={1.8} aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-extrabold text-slate-900">
              {loading ? (
                <LoaderCircle size={24} className="animate-spin text-slate-400" aria-hidden="true" />
              ) : (
                stats.assignmentsCount
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Active tasks & coursework</p>
            <button
              type="button"
              onClick={() => navigate('/lecturer/assignments')}
              className="mt-5 w-full rounded-lg bg-purple-50 py-2.5 text-xs font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer"
            >
              View Assignments
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          3. QUICK ACCESS SECTION (Exact Section 5 Design)
      ==================================================== */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quick Access
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            What would you like to do today? Click any task to begin.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Class Schedule */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <CalendarDays size={24} strokeWidth={1.8} className="text-blue-700" aria-hidden="true" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Class Schedule
              </h3>

              <p className="mb-5 text-base text-slate-600">
                Check your upcoming classes and teaching timetable.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/lecturer/schedule')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition cursor-pointer"
            >
              <span>View Schedule</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Card 2: Study Materials */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <FileUp size={24} strokeWidth={1.8} className="text-blue-700" aria-hidden="true" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Study Materials
              </h3>

              <p className="mb-5 text-base text-slate-600">
                Upload and manage lecture notes and learning materials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/lecturer/materials')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition cursor-pointer"
            >
              <span>Manage Materials</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Card 3: Assignments */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <ClipboardList size={24} strokeWidth={1.8} className="text-blue-700" aria-hidden="true" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Assignments
              </h3>

              <p className="mb-5 text-base text-slate-600">
                Create assignments and review student submissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/lecturer/assignments')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition cursor-pointer"
            >
              <span>Open Assignments</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Card 4: My Profile */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <CircleUserRound size={24} strokeWidth={1.8} className="text-blue-700" aria-hidden="true" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                My Profile
              </h3>

              <p className="mb-5 text-base text-slate-600">
                View your account details and update your password.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/lecturer/profile')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition cursor-pointer"
            >
              <span>View Profile</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          4. TODAY'S ACTIVITIES & UPCOMING CLASSES
      ==================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Next Scheduled Class */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#173B75]">
                <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Class</h3>
                <p className="text-[11px] text-slate-500">Next scheduled teaching session</p>
              </div>
            </div>
            <Link
              to="/lecturer/schedule"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#173B75] hover:underline"
            >
              <span>Full Timetable</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {nextClass ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-md bg-[#173B75] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    {nextClass.batchId ? `Batch ${nextClass.batchId}` : 'Class Session'}
                  </span>
                  <h4 className="mt-2 text-base font-extrabold text-slate-900">
                    {nextClass.subject}
                  </h4>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock size={16} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                  <span>
                    {nextClass.date} • {nextClass.startTime} – {nextClass.endTime}
                  </span>
                </span>
                {nextClass.room && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} strokeWidth={1.8} className="text-emerald-600" aria-hidden="true" />
                    <span>Classroom: {nextClass.room}</span>
                  </span>
                )}
              </div>

              {nextClass.notes && (
                <p className="mt-2 text-xs italic text-slate-500">
                  Note: {nextClass.notes}
                </p>
              )}

              <button
                type="button"
                onClick={() => navigate('/lecturer/schedule')}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#173B75] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition cursor-pointer"
              >
                <span>View Class Details</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
              <CheckCircle2 size={32} strokeWidth={1.8} className="mx-auto text-emerald-500 mb-2" aria-hidden="true" />
              <p className="font-bold text-slate-800">You have no scheduled activities for today.</p>
              <p className="mt-1 text-slate-500">Check the class timetable for upcoming lecture dates.</p>
            </div>
          )}
        </div>

        {/* Recent Coursework / Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <ClipboardList size={20} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Assignments</h3>
                <p className="text-[11px] text-slate-500">Active coursework and assigned student tasks</p>
              </div>
            </div>
            <Link
              to="/lecturer/assignments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#173B75] hover:underline"
            >
              <span>All Assignments</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {todayActivities.recentAssignments?.length > 0 ? (
            <div className="space-y-2.5">
              {todayActivities.recentAssignments.slice(0, 3).map((assignment) => (
                <div
                  key={assignment._id || assignment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-slate-100/70 transition"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {assignment.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Batch: {assignment.batchId || 'All'} • {assignment.course || 'Diploma'}
                    </p>
                  </div>
                  <Link
                    to="/lecturer/assignments"
                    className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-[#173B75] border border-slate-200 hover:bg-slate-50 shadow-2xs"
                  >
                    <Eye size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span>View Task</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
              <ClipboardList size={32} strokeWidth={1.8} className="mx-auto text-slate-400 mb-2" aria-hidden="true" />
              <p className="font-bold text-slate-800">No assignments published yet.</p>
              <p className="mt-1 text-slate-500">Create coursework and projects under Assignments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
