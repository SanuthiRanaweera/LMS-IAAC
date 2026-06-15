import {
  LayoutDashboard,
  Library,
  Calendar,
  FileText,
  Video,
  Bell,
  LogOut,
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
  const avatarUrl =
    student?.avatarDataUri ||
    student?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      student?.name || 'User'
    )}&background=0369a1&color=fff`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto w-full px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-16 flex-col gap-2 py-2 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:py-0">
          
          {/* Mobile top row / Desktop left logo */}
          <div className="flex w-full items-center justify-between lg:w-auto lg:justify-start">
            <div className="flex items-center lg:border-r lg:border-slate-100 lg:pr-8">
              <NavLink to="/dashboard" aria-label="Go to dashboard">
                <img
                  src={logo}
                  alt="IAAC Logo"
                  className="h-9 w-auto object-contain sm:h-10"
                />
              </NavLink>
            </div>

            {/* Mobile right actions */}
            <div className="flex items-center gap-2 lg:hidden">
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

              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm transition-colors hover:bg-red-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex w-full items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 lg:flex-1 lg:justify-center lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                    'sm:px-4',
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden items-center gap-4 pl-8 lg:flex">
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sky-800 shadow-sm transition-colors hover:bg-sky-100"
            >
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-700">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />
              </span>
              <span className="text-sm font-semibold">Notifications</span>
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 py-1 pl-4">
              <div className="text-right">
                <NavLink
                  to="/profile"
                  className="block max-w-32 truncate text-xs font-bold text-slate-900 hover:underline"
                >
                  {student?.name || 'User'}
                </NavLink>

                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-500"
                >
                  <LogOut className="h-3 w-3" />
                  Log Out
                </button>
              </div>

              <NavLink
                to="/profile"
                className="h-9 w-9 shrink-0 rounded-full border-2 border-sky-100 p-0.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                aria-label="Open profile"
              >
                <img
                  src={avatarUrl}
                  className="h-full w-full rounded-full object-cover"
                  alt="Profile"
                />
              </NavLink>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}