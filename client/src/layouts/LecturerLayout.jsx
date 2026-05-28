import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/http.js';
import { LayoutDashboard, Calendar, Library, Video, LogOut, Bell } from 'lucide-react';
import logo from '../image/logo.png';

const NAV_LINKS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/lecturer/dashboard' },
  { label: 'Schedule', icon: Calendar, to: '/lecturer/schedule' },
  { label: 'Recordings', icon: Video, to: '/lecturer/recordings' },
  { label: 'Knowledge Hub', icon: Library, to: '/lecturer/knowledge-hub' },
  { label: 'Feedback Reports', icon: Bell, to: '/lecturer/feedback-reports' },
];

export default function LecturerLayout() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/auth/me')
      .then((data) => {
        if (cancelled) return;
        if (data?.role !== 'lecturer') {
          navigate('/login', { replace: true });
          return;
        }
        setLecturer(data);
      })
      .catch((err) => {
        if (!cancelled) {
          navigate('/login', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  const onLogout = () => {
    apiPost('/api/auth/logout')
      .catch(() => {})
      .finally(() => {
        setLecturer(null);
        navigate('/login', { replace: true });
      });
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-slate-50 p-6 text-sm text-slate-700">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-full px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Branding */}
            <div className="flex items-center pr-8 border-r border-slate-100">
              <img src={logo} alt="IAAC Logo" className="h-10 w-auto object-contain" />
            </div>

            {/* Nav */}
            <nav className="flex flex-1 items-center justify-center gap-2">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Profile */}
            <div className="flex items-center gap-4 pl-8 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-900">{lecturer?.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Lecturer</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-[#003580] flex items-center justify-center text-white font-bold text-sm">
                {lecturer?.name?.[0] || 'L'}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full p-5 md:p-6">
        <Outlet context={{ lecturer }} />
      </main>
    </div>
  );
}
