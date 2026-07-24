import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ApiError, apiGet } from '../api/http.js';
import AssignmentCard from '../components/AssignmentCard.jsx';
import DashboardMain from '../components/DashboardMain.jsx';
import { fetchStudentAssignments } from '../services/assignments.service.js';

// 1. Professional Skeleton Component
// This replaces the plain "Loading..." text with a layout that matches your UI.
const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-8 p-8 max-w-6xl mx-auto">
    <div className="h-40 rounded-3xl bg-slate-200"></div> {/* Hero Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-64 rounded-3xl bg-slate-200"></div> {/* Notification Skeleton */}
      <div className="h-64 rounded-3xl bg-slate-200"></div> {/* Quick Action Skeleton */}
    </div>
  </div>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { student } = useOutletContext();
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignmentsError, setAssignmentsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([apiGet('/api/dashboard'), fetchStudentAssignments()]).then((results) => {
      if (cancelled) return;

      const [dashboardResult, assignmentsResult] = results;

      if (dashboardResult.status === 'rejected') {
        const err = dashboardResult.reason;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(err?.message || 'Unable to load dashboard data.');
        setIsLoading(false);
        return;
      }

      setData(dashboardResult.value);

      if (assignmentsResult.status === 'fulfilled') {
        setAssignments(assignmentsResult.value);
        setAssignmentsError('');
      } else {
        setAssignments([]);
        setAssignmentsError(assignmentsResult.reason?.message || 'Unable to load assignments.');
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // 2. Error State
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
        <p className="font-semibold">Oops!</p>
        <p>{error}</p>
      </div>
    );
  }

  // 3. Loading State (Showing Skeleton)
  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  // 4. Success State
  return (
    <div className="space-y-6">
      <DashboardMain
        student={student || data.student}
        progress={data.progress}
        notifications={data.notifications}
        activeMaterial={data.activeMaterial}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assignments</h2>
            <p className="text-sm text-slate-500">Track deadlines in real time and submit directly to OneDrive.</p>
          </div>
        </div>

        {assignmentsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{assignmentsError}</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No assignments are currently targeted to your cohort.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onSubmitted={(assignmentId, submission) => {
                  setAssignments((current) =>
                    current.map((item) =>
                      item.id === assignmentId
                        ? {
                            ...item,
                            status: submission?.status || item.status,
                            submission: submission || item.submission,
                          }
                        : item
                    )
                  );
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}