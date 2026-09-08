import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { apiGet, apiPost } from '../../api/http.js';

import AdminSidebar from '../components/AdminSidebar.jsx';
import AdminTopbar from '../components/AdminTopbar.jsx';

export default function AdminLayout() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      try {
        const data = await apiGet('/api/admin/auth/me');

        if (!cancelled) {
          setAdmin(data);
        }
      } catch {
        if (!cancelled) {
          setAdmin(null);
          navigate('/admin/login', {
            replace: true,
          });
        }
      } finally {
        if (!cancelled) {
          setChecked(true);
        }
      }
    }

    loadAdmin();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onLogout() {
    try {
      await apiPost('/api/admin/auth/logout');
    } catch {
      // Even if the logout request fails,
      // clear the local admin session and return to login.
    } finally {
      setAdmin(null);

      navigate('/admin/login', {
        replace: true,
      });
    }
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-sm">
          Loading admin portal...
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fa] text-slate-900">
      <div className="min-h-screen md:flex">
        <AdminSidebar
          admin={admin}
          onLogout={onLogout}
          dark={false}
        />

        <div className="min-w-0 flex-1">
          <AdminTopbar
            admin={admin}
            onLogout={onLogout}
            dark={false}
          />

          <main className="w-full max-w-full px-4 py-5 sm:px-5 md:px-6">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet context={{ admin }} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}