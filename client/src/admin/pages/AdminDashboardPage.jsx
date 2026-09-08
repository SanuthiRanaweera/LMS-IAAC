import { useEffect, useState } from 'react';
import { apiGet } from '../../api/http.js';
import { useOutletContext } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronUp, FileText, Users } from 'lucide-react';

const STAT_ICONS = {
  students: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 17c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 17c0-2.4 2-4.3 4.5-4.3s4.5 1.9 4.5 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.7 5.5a2.6 2.6 0 0 1 0 5.1M14.5 12.9c1.8.5 3 2 3 4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  materials: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3.5h7l3 3V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 9h6M7 12h6M7 6.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function StatCard({ label, value, icon, tint, sublabel }) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 blur-2xl ${tint.glow}`} aria-hidden="true" />
      <div className="relative flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint.bg} ${tint.text}`}>
          {icon}
        </div>
      </div>
      <div className="relative mt-14 text-4xl font-light tracking-tight text-slate-900">{value}</div>
      {sublabel ? <div className="relative mt-10 text-sm text-slate-500">{sublabel}</div> : null}
    </div>
  );
}

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

const BRANCH_BAR_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

export default function AdminDashboardPage() {
  const { admin } = useOutletContext() || {};
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [expandedBranches, setExpandedBranches] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setError(null);

    apiGet('/api/admin/metrics')
      .then((json) => {
        if (!cancelled) setMetrics(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        Failed to load admin dashboard.
      </div>
    );
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
  }).format(new Date());

  return (
    <div className="space-y-5 bg-[#f5f7fa] text-slate-900">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">{greeting}</div>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">
            {admin?.name || 'Admin'} <span className="text-slate-400">— command center</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-sky-700" />
          <span>{formattedDate}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-800">
            {(admin?.name || 'A').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr_0.65fr]">
        <div className="relative overflow-hidden rounded-[22px] border border-sky-100 bg-[#eaf3fb] p-6 text-slate-900 shadow-sm sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-800">
                {STAT_ICONS.students}
                Total students
              </div>
              <div className="mt-4 text-5xl font-light tracking-tight">{metrics ? metrics.students : '—'}</div>
              <div className="mt-2 text-sm text-slate-500">{branchCounts.length} academies · live enrollment</div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-7 space-y-3">
            {branchCounts.slice(0, 3).map((item) => {
              const width = maxBranchCount ? Math.max(8, Math.round((item.studentCount / maxBranchCount) * 100)) : 0;
              return (
                <div key={item.branchId} className="grid grid-cols-[84px_1fr_32px] items-center gap-3 text-xs">
                  <span className="truncate text-slate-500">{item.branchName}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right font-semibold text-slate-700">{item.studentCount}</span>
                </div>
              );
            })}
          </div>
        </div>
        <StatCard
          label="Users"
          value={metrics ? metrics.users : '—'}
          icon={<Users className="h-5 w-5" />}
          tint={{ bg: 'bg-[#30251f]', text: 'text-[#c89372]', glow: 'bg-orange-300' }}
          sublabel="Admin & staff accounts"
        />
        <StatCard
          label="Materials"
          value={metrics ? metrics.materials : '—'}
          icon={<FileText className="h-5 w-5" />}
          tint={{ bg: 'bg-[#29291f]', text: 'text-[#dedca0]', glow: 'bg-yellow-200' }}
          sublabel="Files published to dashboards"
        />
      </section>

      {/* Students by branch */}
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">Academy distribution</div>
            <p className="mt-1 text-sm text-slate-500">Share of total enrollment · click an academy for intakes</p>
          </div>
          {totalBranchStudents > 0 ? (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">{totalBranchStudents} students</div>
          ) : null}
        </div>

        {branchCounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No academy-wise student data available.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {branchCounts.map((item, i) => {
              const pct = maxBranchCount > 0 ? Math.max(4, Math.round((item.studentCount / maxBranchCount) * 100)) : 0;
              const color = BRANCH_BAR_COLORS[i % BRANCH_BAR_COLORS.length];
              const isExpanded = expandedBranches.has(item.branchId);
              const intakes = Array.isArray(item.intakes) ? item.intakes : [];
              return (
                <div key={item.branchId}>
                  <button
                    type="button"
                    onClick={() => toggleBranch(item.branchId)}
                    aria-expanded={isExpanded}
                    className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-sky-700" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      {item.branchName}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{item.studentCount}</span>
                  </button>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${color} opacity-80 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isExpanded ? (
                    <div className="ml-6 mt-3 space-y-1 border-l border-slate-200 pl-3">
                      {intakes.length === 0 ? (
                        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          No intake data available.
                        </div>
                      ) : (
                        intakes.map((intake) => (
                          <div
                            key={intake.intakeId}
                            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs transition hover:bg-sky-50"
                          >
                            <span className="font-medium text-slate-600">{intake.intakeName}</span>
                            <span className="font-bold text-slate-800">{intake.studentCount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent study materials */}
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <div className="text-xl font-semibold tracking-tight text-slate-900">Recent uploads</div>
          <p className="mt-1 text-sm text-slate-500">Latest study materials across the portal</p>
        </div>

        {!Array.isArray(metrics?.recentMaterials) || metrics.recentMaterials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No study materials uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.recentMaterials.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-transparent p-3.5 transition hover:border-sky-200 hover:bg-sky-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#302020] text-[#ed6f72]">
                  {STAT_ICONS.materials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                    {item.course ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{item.course}</span>
                    ) : null}
                    {item.weekNumber ? <span>Week {item.weekNumber}</span> : null}
                    <span>•</span>
                    <span>{item.branchId}</span>
                    <span>•</span>
                    <span>{item.batchId}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-slate-500">
                  <div className="font-medium text-slate-700">{item.uploadedByName || 'Admin'}</div>
                  <div className="mt-0.5">{timeAgo(item.uploadedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
