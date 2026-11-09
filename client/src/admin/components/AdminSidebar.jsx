import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Files,
  LayoutDashboard,
  Users,
  UsersRound,
  GraduationCap,
  Video,
  Library,
  MessageSquareText,
  Menu,
  X,
  ClipboardCheck,
  ClipboardList,
  LogOut,
} from 'lucide-react';

import { NavLink, useLocation } from 'react-router-dom';

import SidebarBrandHeader, {
  ROLE_CONFIG,
  normalizeUserRole,
} from '../../components/SidebarBrandHeader.jsx';
import logoImg from '../../image/logo.png';

/* =========================================================
   GROUPED ADMIN NAVIGATION (Visual Hierarchy)
========================================================= */

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Academic Management',
    items: [
      {
        label: 'Students',
        to: '/admin/students',
        icon: UsersRound,
      },
      {
        label: 'Lecturers',
        to: '/admin/lecturers',
        icon: GraduationCap,
        superAdminOnly: true,
      },
      {
        label: 'Course Overview',
        to: '/admin/course-overview',
        icon: BookOpen,
        superAdminOnly: true,
      },
      {
        label: 'Class Schedule',
        to: '/admin/schedule',
        icon: CalendarDays,
      },
      {
        label: 'Study Materials',
        to: '/admin/materials/upload',
        icon: Files,
      },
      {
        label: 'Assignments',
        to: '/admin/assignments',
        icon: ClipboardList,
      },
      {
        label: 'Results',
        to: '/admin/results',
        icon: ClipboardCheck,
      },
      {
        label: 'Recordings',
        to: '/admin/recordings',
        icon: Video,
        superAdminOnly: true,
      },
      {
        label: 'Knowledge Hub',
        to: '/admin/knowledge-hub',
        icon: Library,
        superAdminOnly: true,
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Users',
        to: '/admin/users',
        icon: Users,
        superAdminOnly: true,
      },
      {
        label: 'Feedback Center',
        to: '/admin/feedback',
        icon: MessageSquareText,
        superAdminOnly: true,
      },
    ],
  },
];

/* =========================================================
   ADMIN SIDEBAR
========================================================= */

export default function AdminSidebar({ admin, onLogout, dark = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const role = admin?.role || 'staff';
  const isSuperAdmin = role === 'superadmin';

  const activeRoleKey = normalizeUserRole(role);
  const branding = ROLE_CONFIG[activeRoleKey] || ROLE_CONFIG.admin;

  const limitedRole = role === 'staff' || role === 'lecturer';
  const adminName = admin?.name || 'Admin';

  /* Filter navigation groups based on role permissions */
  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((group) => group.items.length > 0);

  /* Active link matching */
  const isLinkActive = (item, isActive) => {
    if (item.to === '/admin') {
      return location.pathname === '/admin';
    }
    if (item.to === '/admin/students') {
      return location.pathname.startsWith('/admin/students');
    }
    if (item.to === '/admin/results') {
      return location.pathname.startsWith('/admin/results');
    }
    return isActive;
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  /* =======================================================
     LIMITED ROLE NOTICE
  ======================================================= */
  const LimitedRoleNotice = () =>
    limitedRole ? (
      <div className="mb-3 rounded-xl border border-blue-200/80 bg-blue-50/70 p-2.5">
        <div className={`text-[11px] font-bold ${dark ? 'text-sky-300' : 'text-blue-700'}`}>
          Limited Role
        </div>
        <p className={`text-[10px] leading-relaxed mt-0.5 ${dark ? 'text-white/60' : 'text-blue-600'}`}>
          Some administrative features are restricted for your role.
        </p>
      </div>
    ) : null;

  /* =======================================================
     SIDEBAR CONTENT (Fixed Header, Scrollable Nav, Fixed Footer)
  ======================================================= */
  const SidebarBody = ({ onNavigate }) => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* 1. FIXED HEADER */}
      <div className="shrink-0">
        <SidebarBrandHeader
          user={admin}
          role={role}
          displayName={adminName}
          dark={dark}
        />
      </div>

      {/* 2. SCROLLABLE NAVIGATION AREA */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10"
      >
        <LimitedRoleNotice />

        <div className="space-y-3.5">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pt-1 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 select-none">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/admin'}
                        onClick={onNavigate}
                        className={({ isActive }) => {
                          const isCurrent = isLinkActive(item, isActive);
                          return [
                            'group flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors duration-150',
                            isCurrent
                              ? dark
                                ? 'bg-sky-400/15 text-sky-300 font-semibold ring-1 ring-sky-400/20'
                                : 'bg-blue-50/90 text-blue-800 font-semibold ring-1 ring-blue-100/90'
                              : dark
                                ? 'text-white/65 hover:bg-white/5 hover:text-white'
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
                          ].join(' ');
                        }}
                      >
                        {({ isActive }) => {
                          const isCurrent = isLinkActive(item, isActive);
                          return (
                            <>
                              <Icon
                                size={19}
                                strokeWidth={isCurrent ? 2.2 : 1.8}
                                className={`shrink-0 transition-colors ${
                                  isCurrent
                                    ? dark ? 'text-sky-300' : 'text-blue-700'
                                    : dark ? 'text-white/50 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-700'
                                }`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.label}</span>
                            </>
                          );
                        }}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* 3. FIXED BOTTOM ACCOUNT SECTION */}
      <div
        className={`shrink-0 border-t p-2.5 transition-colors ${
          dark ? 'border-white/10 bg-[#101010]/60' : 'border-slate-200/70 bg-white/40'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate();
            if (typeof onLogout === 'function') onLogout();
          }}
          className={`group flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            dark
              ? 'text-white/70 hover:bg-rose-500/15 hover:text-rose-300'
              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
          }`}
          title="Sign out of IAAC Management Portal"
        >
          <LogOut
            size={18}
            strokeWidth={1.8}
            className={`shrink-0 transition-colors ${
              dark ? 'text-white/50 group-hover:text-rose-300' : 'text-slate-400 group-hover:text-rose-600'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ===============================================
          MOBILE TOP BAR (Glassmorphism)
      =============================================== */}
      <div
        className={`sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-xs md:hidden ${
          dark
            ? 'border-white/10 bg-[#101010]/85 backdrop-blur-xl'
            : 'border-white/80 bg-white/80 backdrop-blur-xl'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-100 shadow-2xs">
            <img
              src={logoImg}
              alt="IAAC College Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className={`truncate text-sm font-extrabold tracking-tight ${dark ? 'text-white' : 'text-[#003580]'}`}>
              {branding.title}
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <span className={`truncate text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'}`}>
                {adminName}
              </span>
              <span className={`inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-bold ${branding.badgeClass}`}>
                {branding.label}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-colors ${
            dark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
          }`}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ===============================================
          DESKTOP FLOATING GLASS SIDEBAR (3-Section Layout)
      =============================================== */}
      <aside
        className={`sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 overflow-hidden md:my-4 md:ml-4 md:flex flex-col rounded-2xl border shadow-lg shadow-slate-900/5 transition-all z-30 ${
          dark
            ? 'border-white/10 bg-[#101010]/85 backdrop-blur-xl'
            : 'border-white/70 bg-white/82 backdrop-blur-xl'
        }`}
      >
        <SidebarBody />
      </aside>

      {/* ===============================================
          MOBILE DRAWER
      =============================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            aria-label="Close admin menu"
            onClick={closeMobileMenu}
          />

          {/* Drawer */}
          <aside
            className={`absolute left-0 top-0 h-full w-72 max-w-[86vw] overflow-hidden flex flex-col shadow-2xl ${
              dark
                ? 'bg-[#101010]/95 backdrop-blur-2xl border-r border-white/10'
                : 'bg-white/95 backdrop-blur-2xl border-r border-white/80'
            }`}
          >
            <div className={`flex h-14 items-center justify-between border-b px-4 shrink-0 ${dark ? 'border-white/10' : 'border-slate-200/80'}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wider ${dark ? 'text-white' : 'text-[#003580]'}`}>
                {branding.title}
              </span>

              <button
                type="button"
                onClick={closeMobileMenu}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <SidebarBody onNavigate={closeMobileMenu} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
