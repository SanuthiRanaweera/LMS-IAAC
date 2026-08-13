import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import TopNavbar from '../components/TopNavbar.jsx';

import {
  apiGet,
  apiPost,
} from '../api/http.js';

export default function StudentLayout() {
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(false);

  const [student, setStudent] = useState(null);

  const [authChecked, setAuthChecked] = useState(false);

  /* =========================================================
     LOAD SAVED THEME
  ========================================================= */

  useEffect(() => {
    const storedTheme =
      localStorage.getItem('iaac-theme');

    setIsDark(
      storedTheme === 'dark'
    );
  }, []);

  /* =========================================================
     APPLY THEME
  ========================================================= */

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      isDark
    );

    localStorage.setItem(
      'iaac-theme',
      isDark
        ? 'dark'
        : 'light'
    );
  }, [isDark]);

  /* =========================================================
     CHECK STUDENT AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadStudent() {
      try {
        const data =
          await apiGet(
            '/api/auth/me'
          );

        if (!cancelled) {
          setStudent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setStudent(null);
        }

        if (
          err?.status === 401
        ) {
          navigate(
            '/login',
            {
              replace: true,
            }
          );
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    loadStudent();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function onLogout() {
    try {
      await apiPost(
        '/api/auth/logout'
      );
    } catch {
      // Even if server logout fails,
      // clear local UI state.
    } finally {
      setStudent(null);

      navigate(
        '/login',
        {
          replace: true,
        }
      );
    }
  }

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-700">
        Loading student portal...
      </div>
    );
  }

  if (!student) {
    return null;
  }

  /* =========================================================
     STUDENT PORTAL
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <TopNavbar
        student={student}
        isDark={isDark}
        onToggleTheme={() =>
          setIsDark(
            (value) => !value
          )
        }
        onLogout={onLogout}
      />

      <main className="mx-auto w-full p-5 md:p-6">
        <Outlet
          context={{
            student,
          }}
        />
      </main>
    </div>
  );
}