import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ApiError, apiGet } from '../api/http.js';
import DashboardMain from '../components/DashboardMain.jsx';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiGet('/api/dashboard')
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            navigate('/login', { replace: true });
            return;
          }

          setError(err?.message || 'Unable to load dashboard data.');
          setIsLoading(false);
        }
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
    <DashboardMain
      // We pass the student object, falling back to data.student if the context is empty
      student={student || data.student}
      progress={data.progress}
      notifications={data.notifications}
      activeMaterial={data.activeMaterial}
    />
  );
}