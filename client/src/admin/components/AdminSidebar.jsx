import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Files,
  FileUp,
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
} from 'lucide-react';

import { NavLink, useLocation } from 'react-router-dom';

import SidebarBrandHeader, {
  ROLE_CONFIG,
  normalizeUserRole,
} from '../../components/SidebarBrandHeader.jsx';
import logoImg from '../../image/logo.png';

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const NAV = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: LayoutDashboard,
  },

  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
    superAdminOnly: true,
  },

  {
    label: 'Lecturers',
    to: '/admin/lecturers',
    icon: GraduationCap,
    superAdminOnly: true,
  },

  {
    label: 'Students',
    to: '/admin/students',
    icon: UsersRound,
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

  /* =========================
     NEW RESULTS MENU
  ========================= */

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

  {
    label: 'Feedback',
    to: '/admin/feedback',
    icon: MessageSquareText,
    superAdminOnly: true,
  },
];

/* =========================================================
   ADMIN SIDEBAR
========================================================= */

export default function AdminSidebar({ admin, dark = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  const role =
    admin?.role || 'staff';

  const activeRoleKey = normalizeUserRole(role);
  const branding = ROLE_CONFIG[activeRoleKey] || ROLE_CONFIG.admin;

  /* =======================================================
     FILTER NAVIGATION BY ROLE
  ======================================================= */

  const nav = NAV.filter(
    (item) =>
      !item.superAdminOnly ||
      role === 'superadmin'
  );

  const limitedRole =
    role === 'staff' ||
    role === 'lecturer';

  /* =======================================================
     ROLE LABEL
  ======================================================= */

  const roleLabel =
    role === 'superadmin'
      ? 'Super Admin'
      : role === 'lecturer'
        ? 'Lecturer'
        : 'Staff Admin';

  const adminName =
    admin?.name || 'Admin';

  /* =======================================================
     ACTIVE LINK LOGIC
  ======================================================= */

  const isLinkActive = (
    item,
    isActive
  ) => {
    /*
    Dashboard should only be active on:

    /admin

    and NOT:

    /admin/results
    /admin/students
    etc.
    */
    if (item.to === '/admin') {
      return (
        location.pathname ===
        '/admin'
      );
    }

    /*
    Students also has child pages,
    so keep Students active for
    /admin/students/...
    */
    if (
      item.to ===
      '/admin/students'
    ) {
      return location.pathname.startsWith(
        '/admin/students'
      );
    }

    /*
    Results may later have:

    /admin/results/:id

    /admin/results/edit/:id

    so keep Results active for
    all those pages.
    */
    if (
      item.to ===
      '/admin/results'
    ) {
      return location.pathname.startsWith(
        '/admin/results'
      );
    }

    return isActive;
  };

  /* =======================================================
     MOBILE MENU
  ======================================================= */

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  /* =======================================================
     SIDEBAR HEADER (Dynamic Role-Based IAAC Branding)
  ======================================================= */

  const SidebarHeader = () => (
    <SidebarBrandHeader
      user={admin}
      role={role}
      displayName={adminName}
      dark={dark}
    />
  );

  /* =======================================================
     LIMITED ROLE NOTICE
  ======================================================= */

  const LimitedRoleNotice = () =>
    limitedRole ? (
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className={`mb-1 text-xs font-bold ${dark ? 'text-sky-300' : 'text-blue-700'}`}>
          Limited Role
        </div>

        <p className={`text-[11px] leading-relaxed ${dark ? 'text-white/55' : 'text-blue-600'}`}>
          You can manage allowed academic content,
          schedules, assignments and student results,
          but some administrative features are restricted.
        </p>
      </div>
    ) : null;

  /* =======================================================
     NAVIGATION LINKS
  ======================================================= */

  const SidebarLinks = ({
    onNavigate,
  }) => (
    <nav className="p-3">
      <LimitedRoleNotice />

      <ul className="space-y-1.5">
        {nav.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={
                  item.to ===
                  '/admin'
                }
                onClick={onNavigate}
                className={({
                  isActive,
                }) => {
                  const isCurrent = isLinkActive(item, isActive);
                  return [
                    'group relative flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
                    isCurrent
                      ? dark
                        ? 'bg-sky-400/20 text-sky-300 font-bold shadow-xs'
                        : 'bg-blue-100/70 text-[#003580] font-bold border border-blue-200/70 shadow-xs'
                      : dark
                        ? 'text-white/65 hover:bg-white/10 hover:text-white'
                        : 'text-slate-600 hover:bg-white/90 hover:text-slate-950 hover:shadow-2xs',
                  ].join(' ');
                }}
              >
                {({ isActive }) => {
                  const isCurrent = isLinkActive(item, isActive);
                  return (
                    <>
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                          isCurrent ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {isCurrent && (
                        <span
                          className="ml-auto h-2 w-2 rounded-full bg-blue-600 shadow-xs animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  );
                }}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  /* =======================================================
     REUSABLE SIDEBAR CONTENT
  ======================================================= */

  const SidebarContent = ({
    onNavigate,
  }) => (
    <>
      <SidebarHeader />

      <SidebarLinks
        onNavigate={
          onNavigate
        }
      />
    </>
  );

  /* =======================================================
     RENDER
  ======================================================= */

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-100 shadow-2xs">
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
          onClick={() =>
            setMobileOpen(true)
          }
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-colors ${
            dark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
          }`}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ===============================================
          DESKTOP FLOATING GLASS SIDEBAR
      =============================================== */}

      <aside
        className={`sticky top-4 hidden h-[calc(100vh-2rem)] w-68 shrink-0 overflow-y-auto md:my-4 md:ml-4 md:block rounded-3xl border shadow-xl shadow-slate-900/5 transition-all z-30 ${
          dark
            ? 'border-white/10 bg-[#101010]/80 backdrop-blur-2xl'
            : 'border-white/85 bg-white/78 backdrop-blur-2xl'
        }`}
      >
        <SidebarContent />
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
            onClick={
              closeMobileMenu
            }
          />

          {/* Drawer */}
          <aside
            className={`absolute left-0 top-0 h-full w-72 max-w-[86vw] overflow-y-auto shadow-2xl ${
              dark
                ? 'bg-[#101010]/95 backdrop-blur-2xl border-r border-white/10'
                : 'bg-white/90 backdrop-blur-2xl border-r border-white/80'
            }`}
          >
            <div className={`flex h-14 items-center justify-between border-b px-4 ${dark ? 'border-white/10' : 'border-slate-200/80'}`}>
              <span className={`text-sm font-extrabold tracking-tight ${dark ? 'text-white' : 'text-[#003580]'}`}>
                {branding.title}
              </span>

              <button
                type="button"
                onClick={
                  closeMobileMenu
                }
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarContent
              onNavigate={
                closeMobileMenu
              }
            />
          </aside>
        </div>
      )}
    </>
  );
}