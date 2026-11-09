import { useEffect, useState } from 'react';
import { apiGet } from '../../api/http.js';
import { useOutletContext, Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Files,
  UsersRound,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  MessageSquareText,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

function timeAgo(dateString) {
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-GB');
}

const BRANCH_BAR_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

export default function AdminDashboardPage() {
  const { admin } = useOutletContext() || {};
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBranches, setExpandedBranches] = useState(() => new Set());

  const isSuperAdmin = admin?.role === 'superadmin';

  useEffect(() => {
    if (admin?.role === 'lecturer') {
      window.location.replace('/lecturer/dashboard');
      return;
    }

    let cancelled = false;
    setError(null);
    setLoading(true);

    apiGet('/api/admin/metrics')
      .then((json) => {
        if (!cancelled) setMetrics(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [admin?.role]);

  function toggleBranch(branchId) {
    setExpandedBranches((current) => {
      const next = new Set(current);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  }

  const branchCounts = Array.isArray(metrics?.branchStudentCounts) ? metrics.branchStudentCounts : [];
  const maxBranchCount = branchCounts.reduce((max, item) => Math.max(max, item.studentCount || 0), 0);
  const totalBranchStudents = branchCounts.reduce((sum, item) => sum + (item.studentCount || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200/80 bg-white/80 p-8 text-center backdrop-blur-xl shadow-lg shadow-rose-900/5">
        <p className="text-sm font-bold text-rose-800">Failed to load academic dashboard metrics.</p>
        <p className="mt-1 text-xs text-rose-600">{error.message || 'Please refresh the page to retry.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =======================================================
          1. GLASSMORPHISM 2.0 WELCOME SECTION
      ======================================================= */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/85 bg-white/75 p-6 sm:p-8 backdrop-blur-2xl shadow-xl shadow-slate-900/5 transition-all"
        aria-label="Welcome Overview"
      >
        {/* Subtle Ambient Glows inside card */}
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/70 px-3 py-1 text-xs font-bold text-blue-700 backdrop-blur-xs mb-3">
              <ShieldCheck size={14} className="text-blue-600" aria-hidden="true" />
              <span>{isSuperAdmin ? 'Super Administrator Console' : 'Staff Command Center'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Welcome back, <span className="text-[#003580]">{admin?.name || 'Administrator'}</span>
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl font-medium">
              Here is an overview of your IAAC academic management system and real-time institutional metrics.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1">
                <CalendarDays size={14} className="text-[#003580]" aria-hidden="true" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live MongoDB Synchronization</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/admin/students"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#003580] hover:bg-[#002860] active:scale-[0.99] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/15 transition-all cursor-pointer"
            >
              <UsersRound size={16} strokeWidth={2} aria-hidden="true" />
              <span>Manage Students</span>
            </Link>

            {isSuperAdmin && (
              <Link
                to="/admin/lecturers"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/90 bg-white/80 hover:bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <GraduationCap size={16} strokeWidth={2} className="text-violet-600" aria-hidden="true" />
                <span>Lecturers</span>
              </Link>
            )}

            <Link
              to="/admin/materials/upload"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/90 bg-white/80 hover:bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Files size={16} strokeWidth={2} className="text-sky-600" aria-hidden="true" />
              <span>Study Materials</span>
            </Link>

            {isSuperAdmin && (
              <Link
                to="/admin/feedback"
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/80 hover:bg-blue-100 px-4 py-2.5 text-xs font-bold text-[#003580] transition-all cursor-pointer"
              >
                <MessageSquareText size={16} strokeWidth={2} className="text-blue-600" aria-hidden="true" />
                <span>Feedback Center</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* =======================================================
          2. GLASSMORPHISM 2.0 STATISTICS CARDS
      ======================================================= */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key Statistics">
        {/* Card 1: Total Students */}
        <div className="relative overflow-hidden rounded-3xl border border-white/85 bg-white/75 p-6 backdrop-blur-xl shadow-lg shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
              <UsersRound size={20} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {loading ? '—' : metrics?.students ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp size={12} /> Active
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 truncate">
            {branchCounts.length} {branchCounts.length === 1 ? 'academy campus' : 'academy campuses'} registered
          </p>
        </div>

        {/* Card 2: Administrative Users / Faculty */}
        <div className="relative overflow-hidden rounded-3xl border border-white/85 bg-white/75 p-6 backdrop-blur-xl shadow-lg shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Portal Staff</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 border border-violet-100 shadow-2xs">
              <Users size={20} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {loading ? '—' : metrics?.users ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Staff Accounts</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 truncate">
            Super Admins, Staff & Lecturers
          </p>
        </div>

        {/* Card 3: Active Study Materials */}
        <div className="relative overflow-hidden rounded-3xl border border-white/85 bg-white/75 p-6 backdrop-blur-xl shadow-lg shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Study Materials</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 shadow-2xs">
              <Files size={20} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {loading ? '—' : metrics?.materials ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Files Published</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 truncate">
            Active syllabus & lecture resources
          </p>
        </div>

        {/* Card 4: Academic Programs / Branches */}
        <div className="relative overflow-hidden rounded-3xl border border-white/85 bg-white/75 p-6 backdrop-blur-xl shadow-lg shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Programs & Academies</span>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
              <Building2 size={20} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {loading ? '—' : (metrics?.programmes || branchCounts.length || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-500">Active Units</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 truncate">
            {totalBranchStudents} students placed across cohorts
          </p>
        </div>
      </section>

      {/* =======================================================
          3. ACADEMY DISTRIBUTION & RECENT ACTIVITY GRID
      ======================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Academy Campus Distribution (7 cols) */}
        <section
          className="lg:col-span-7 relative rounded-3xl border border-white/85 bg-white/75 p-6 sm:p-7 backdrop-blur-2xl shadow-xl shadow-slate-900/5 transition-all"
          aria-label="Academy Distribution"
        >
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Academy Distribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Share of total enrollment by campus · Click to inspect intakes
              </p>
            </div>
            {totalBranchStudents > 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                {totalBranchStudents} Students
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {branchCounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-sm font-medium text-slate-400">
                No academy enrollment records found in database.
              </div>
            ) : (
              branchCounts.map((item, idx) => {
                const isExpanded = expandedBranches.has(item.branchId);
                const intakes = Array.isArray(item.intakes) ? item.intakes : [];
                const pct = maxBranchCount > 0 ? Math.max(8, Math.round((item.studentCount / maxBranchCount) * 100)) : 0;
                const gradient = BRANCH_BAR_GRADIENTS[idx % BRANCH_BAR_GRADIENTS.length];

                return (
                  <div
                    key={item.branchId}
                    className="rounded-2xl border border-slate-100/90 bg-white/60 p-4 transition-all hover:bg-white hover:shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleBranch(item.branchId)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-between text-left cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          {isExpanded ? (
                            <ChevronUp size={16} strokeWidth={2.5} className="text-[#003580]" />
                          ) : (
                            <ChevronDown size={16} strokeWidth={2.5} />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-800 truncate">{item.branchName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{item.studentCount}</span>
                        <span className="text-xs text-slate-400">students</span>
                      </div>
                    </button>

                    {/* Animated Progress Bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Collapsible Intake Breakdown */}
                    {isExpanded && (
                      <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Enrolled Intakes
                        </p>
                        {intakes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No specific intakes registered.</p>
                        ) : (
                          intakes.map((intake) => (
                            <div
                              key={intake.intakeId}
                              className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-1.5 text-xs transition-colors hover:bg-blue-50/60"
                            >
                              <span className="font-semibold text-slate-700">{intake.intakeName}</span>
                              <span className="font-extrabold text-[#003580]">{intake.studentCount}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Recent Uploads & Quick Links (5 cols) */}
        <section
          className="lg:col-span-5 relative rounded-3xl border border-white/85 bg-white/75 p-6 sm:p-7 backdrop-blur-2xl shadow-xl shadow-slate-900/5 transition-all flex flex-col justify-between"
          aria-label="Recent Study Materials"
        >
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Uploads</h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest lecture resources published</p>
              </div>
              <Link
                to="/admin/materials/upload"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#003580] hover:underline"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {!Array.isArray(metrics?.recentMaterials) || metrics.recentMaterials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-sm font-medium text-slate-400">
                  No materials uploaded yet.
                </div>
              ) : (
                metrics.recentMaterials.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-white/70 p-3.5 transition-all hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#003580] border border-blue-100 mt-0.5">
                      <Files size={18} strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 leading-tight">{item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {item.course ? (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.2 font-semibold text-slate-700">
                            {item.course}
                          </span>
                        ) : null}
                        {item.weekNumber ? <span>Week {item.weekNumber}</span> : null}
                        <span>•</span>
                        <span>{timeAgo(item.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Shortcuts Banner */}
          <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#003580]">Examination Results Center</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Manage modular marks and repeat examinations.</p>
              </div>
              <Link
                to="/admin/results"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#003580] text-white hover:bg-[#002860] shadow-xs shrink-0 ml-2"
                aria-label="Go to examination results"
              >
                <ArrowUpRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* =======================================================
          4. ADMINISTRATIVE MODULE SHORTCUT TILES
      ======================================================= */}
      <section aria-label="Portal Navigation Shortcuts">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">Administrative Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Link
            to="/admin/students"
            className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 group-hover:scale-105 transition-transform mb-2">
              <UsersRound size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-slate-800">Students</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Profiles & Batches</span>
          </Link>

          {isSuperAdmin && (
            <Link
              to="/admin/lecturers"
              className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 group-hover:scale-105 transition-transform mb-2">
                <GraduationCap size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-slate-800">Lecturers</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Faculty Directory</span>
            </Link>
          )}

          <Link
            to="/admin/schedule"
            className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 group-hover:scale-105 transition-transform mb-2">
              <CalendarDays size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-slate-800">Schedule</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Lectures & Times</span>
          </Link>

          <Link
            to="/admin/materials/upload"
            className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 group-hover:scale-105 transition-transform mb-2">
              <Files size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-slate-800">Materials</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Upload Notes</span>
          </Link>

          <Link
            to="/admin/results"
            className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:scale-105 transition-transform mb-2">
              <ClipboardCheck size={20} strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-slate-800">Results</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Grades & Resits</span>
          </Link>

          {isSuperAdmin && (
            <Link
              to="/admin/feedback"
              className="group rounded-2xl border border-white/85 bg-white/70 p-4 backdrop-blur-xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-md text-center flex flex-col items-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#003580] group-hover:scale-105 transition-transform mb-2">
                <MessageSquareText size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-slate-800">Feedback</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Reviews & Reports</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
