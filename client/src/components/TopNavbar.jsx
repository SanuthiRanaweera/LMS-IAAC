import { useState } from 'react';
import {
  LayoutDashboard,
  Library,
  Calendar,
  FileText,
  Video,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '../image/logo.png';

const NAV_LINKS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Knowledge Hub', icon: Library, to: '/knowledge-hub' },
  { label: 'Materials', icon: FileText, to: '/materials' },
  { label: 'Class Schedule', icon: Calendar, to: '/schedule' },
  { label: 'Recordings', icon: Video, to: '/recordings' },
  { label: 'My Feedback', icon: Bell, to: '/feedback' },
];

export default function TopNavbar({ student, onLogout }) {
  const [openMenu, setOpenMenu] = useState(false);

  const avatarUrl =
    student?.avatarDataUri ||
    student?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      student?.name || 'User'
    )}&background=0369a1&color=fff`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto w-full px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <NavLink to="/dashboard" aria-label="Go to dashboard">
              <img
                src={logo}
                alt="IAAC Logo"
                className="h-9 w-auto object-contain sm:h-10"
              />
            </NavLink>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-800 shadow-sm transition-colors hover:bg-sky-100"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />
            </button>

            <NavLink
              to="/profile"
              className="h-10 w-10 shrink-0 rounded-full border-2 border-sky-100 p-0.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label="Open profile"
            >
              <img
                src={avatarUrl}
                className="h-full w-full rounded-full object-cover"
                alt="Profile"
              />
            </NavLink>

            {/* Dropdown button */}
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => !prev)}
              aria-label="Open menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              {openMenu ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {openMenu && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpenMenu(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setOpenMenu(false);
                onLogout();
              }}
              className="mt-2 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}