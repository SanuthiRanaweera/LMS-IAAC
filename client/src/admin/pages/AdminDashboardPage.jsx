import { useEffect, useState } from 'react';
import { apiGet } from '../../api/http.js';
import { useOutletContext } from 'react-router-dom';

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute left-0 top-6 h-20 w-1.5 rounded-r-full bg-sky-700" aria-hidden="true" />
        <div className="text-xl font-bold text-slate-900">Welcome, {admin?.name || 'Admin'}!</div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Manage student records, monitor course progress, and publish updates across the portal.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={metrics ? metrics.students : '—'} />
        <StatCard label="Users" value={metrics ? metrics.users : '—'} />
        <StatCard label="Study Materials" value={metrics ? metrics.materials : '—'} />
        <StatCard label="Programmes" value={metrics ? metrics.programmes : '—'} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Income" value={metrics ? metrics.totalIncome : '—'} />
        <StatCard label="Awaiting Payments" value={metrics ? metrics.awaitingPayments : '—'} />
        <StatCard label="Pending Approval" value={metrics ? metrics.pendingApproval : '—'} />
        <StatCard label="Rejected Payments" value={metrics ? metrics.rejectedPayments : '—'} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="text-sm font-bold text-slate-900">Recent Study Materials</div>
          <p className="mt-1 text-xs text-slate-500">Latest uploaded materials available across dashboards.</p>
        </div>

        {!Array.isArray(metrics?.recentMaterials) || metrics.recentMaterials.length === 0 ? (
          <div className="text-sm text-slate-500">No study materials uploaded yet.</div>
        ) : (
          <div className="space-y-3">
            {metrics.recentMaterials.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.course || 'No course'} {item.weekNumber ? `• Week ${item.weekNumber}` : ''} • {item.branchId} • {item.batchId}
                  </div>
                </div>
                <div className="shrink-0 text-right text-[11px] text-slate-500">
                  <div>{item.uploadedByName || 'Admin'}</div>
                  <div>{new Date(item.uploadedAt).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
