import { useEffect, useState } from 'react';
import { apiGet } from '../../api/http.js';
import { useOutletContext } from 'react-router-dom';

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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-60 blur-2xl ${tint.glow}`} aria-hidden="true" />
      <div className="relative flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint.bg} ${tint.text}`}>
          {icon}
        </div>
      </div>
      <div className="relative mt-3 text-3xl font-extrabold text-slate-900">{value}</div>
      {sublabel ? <div className="relative mt-1 text-xs text-slate-400">{sublabel}</div> : null}
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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-sky-700 to-indigo-800 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-200">{greeting}</div>
            <div className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Welcome back, {admin?.name || 'Admin'} 👋
            </div>
            <p className="mt-2 max-w-xl text-sm text-sky-100/90">
              Manage student records, monitor course progress, and publish updates across the portal.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
              {(admin?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="text-sm text-white">
              <div className="font-semibold">{admin?.name || 'Admin'}</div>
              <div className="text-xs text-sky-100/80">{admin?.role === 'superadmin' ? 'Super Admin' : 'Admin'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Students"
          value={metrics ? metrics.students : '—'}
          icon={STAT_ICONS.students}
          tint={{ bg: 'bg-sky-50', text: 'text-sky-700', glow: 'bg-sky-300' }}
          sublabel="Across all academies"
        />
        <StatCard
          label="Users"
          value={metrics ? metrics.users : '—'}
          icon={STAT_ICONS.users}
          tint={{ bg: 'bg-violet-50', text: 'text-violet-700', glow: 'bg-violet-300' }}
          sublabel="Admins & staff accounts"
        />
        <StatCard
          label="Study Materials"
          value={metrics ? metrics.materials : '—'}
          icon={STAT_ICONS.materials}
          tint={{ bg: 'bg-emerald-50', text: 'text-emerald-700', glow: 'bg-emerald-300' }}
          sublabel="Uploaded resources"
        />
      </section>

      {/* Students by branch */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Students by academy</div>
            <p className="mt-0.5 text-xs text-slate-500">Current student count grouped by academy</p>
          </div>
          {totalBranchStudents > 0 ? (
            <div className="text-xs font-semibold text-slate-400">{totalBranchStudents} total</div>
          ) : null}
        </div>

        {branchCounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No academy-wise student data available.
          </div>
        ) : (
          <div className="space-y-4">
            {branchCounts.map((item, i) => {
              const pct = maxBranchCount > 0 ? Math.max(4, Math.round((item.studentCount / maxBranchCount) * 100)) : 0;
              const color = BRANCH_BAR_COLORS[i % BRANCH_BAR_COLORS.length];
              return (
                <div key={item.branchId}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{item.branchName}</span>
                    <span className="text-sm font-bold text-slate-900">{item.studentCount}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent study materials */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <div className="text-sm font-bold text-slate-900">Recent study materials</div>
          <p className="mt-0.5 text-xs text-slate-500">Latest uploaded materials available across dashboards</p>
        </div>

        {!Array.isArray(metrics?.recentMaterials) || metrics.recentMaterials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No study materials uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {metrics.recentMaterials.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-3.5 transition hover:border-sky-200 hover:bg-sky-50/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
