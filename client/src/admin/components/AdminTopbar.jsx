import { useLocation } from 'react-router-dom';
import { Bell, LogOut, ChevronRight, Sparkles } from 'lucide-react';
import { normalizeUserRole, ROLE_CONFIG } from '../../components/SidebarBrandHeader.jsx';

const ROUTE_TITLES = {
  '/admin': { title: 'Academic Command Center', section: 'Overview' },
  '/admin/users': { title: 'User Management', section: 'Administration' },
  '/admin/lecturers': { title: 'Lecturer Directory', section: 'Faculty' },
  '/admin/students': { title: 'Student Management', section: 'Academics' },
  '/admin/course-overview': { title: 'Course Overview', section: 'Academics' },
  '/admin/branches': { title: 'Academy Campuses', section: 'Institution' },
  '/admin/schedule': { title: 'Class Schedule', section: 'Timetable' },
  '/admin/materials/upload': { title: 'Study Materials', section: 'Learning Resources' },
  '/admin/assignments': { title: 'Assignments', section: 'Coursework' },
  '/admin/results': { title: 'Examination Results', section: 'Examinations' },
  '/admin/recordings': { title: 'Lecture Recordings', section: 'Media' },
  '/admin/knowledge-hub': { title: 'Knowledge Hub', section: 'Library' },
  '/admin/feedback': { title: 'Student Feedback Center', section: 'Quality Assurance' },
  '/admin/feedback/moderation': { title: 'Feedback Moderation Log', section: 'Quality Assurance' },
};

export default function AdminTopbar({ admin, onLogout, dark = false }) {
  const location = useLocation();

  const routeMeta = ROUTE_TITLES[location.pathname] || {
    title: location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Admin Portal',
    section: 'Portal',
  };

  const role = normalizeUserRole(admin?.role);
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  return (
    <header
      className={`sticky top-3 z-30 mx-3 sm:mx-4 lg:mx-6 rounded-2xl border shadow-xs transition-all ${
        dark
          ? 'border-white/10 bg-[#101010]/80 backdrop-blur-xl'
          : 'border-white/85 bg-white/75 backdrop-blur-xl shadow-slate-900/5'
      }`}
    >
      <div className="flex h-15 items-center justify-between px-4 sm:px-6">
        {/* Left: Breadcrumbs & Page Title */}
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <span>IAAC</span>
            <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
            <span className="text-slate-500">{routeMeta.section}</span>
            <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
          </div>
          <h1
            className={`truncate text-sm sm:text-base font-bold tracking-tight capitalize ${
              dark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {routeMeta.title}
          </h1>
        </div>

        {/* Right: Notifications, Profile Pill & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications button */}
          <button
            type="button"
            className={`relative rounded-xl p-2 transition-all cursor-pointer ${
              dark
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 hover:shadow-2xs'
            }`}
            aria-label="View notifications"
          >
            <Bell size={18} strokeWidth={2} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* User Profile Pill */}
          <div
            className={`hidden sm:flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-all ${
              dark
                ? 'border-white/10 bg-white/5'
                : 'border-slate-200/80 bg-white/80 shadow-2xs'
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#003580] text-xs font-bold text-white shadow-2xs">
              {(admin?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {admin?.name || 'Administrator'}
              </p>
              <span
                className={`inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-bold ${roleConfig.badgeClass}`}
              >
                {roleConfig.label}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              dark
                ? 'border-white/10 bg-white/5 text-white/70 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
                : 'border-slate-200/90 bg-white/90 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shadow-2xs'
            }`}
            title="Sign out of IAAC Portal"
          >
            <LogOut size={14} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
