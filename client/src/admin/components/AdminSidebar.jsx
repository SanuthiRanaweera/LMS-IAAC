import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  FileText,
  FileUp,
  LayoutDashboard,
  Users,
  GraduationCap,
  Video,
  Library,
  MessageSquare,
  Menu,
  X,
  ClipboardCheck,
} from 'lucide-react';

import { NavLink, useLocation } from 'react-router-dom';

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
    label: 'Students',
    to: '/admin/students',
    icon: GraduationCap,
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
    icon: Calendar,
  },

  {
    label: 'Study Materials',
    to: '/admin/materials/upload',
    icon: FileText,
  },

  {
    label: 'Assignments',
    to: '/admin/assignments',
    icon: FileUp,
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
    icon: MessageSquare,
    superAdminOnly: true,
  },
];

/* =========================================================
   ADMIN SIDEBAR
========================================================= */

export default function AdminSidebar({ admin }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();

  const role =
    admin?.role || 'staff';

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
     SIDEBAR HEADER
  ======================================================= */

  const SidebarHeader = () => (
    <div className="border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003580] text-sm font-bold text-white shadow-sm">
          IA
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">
            IAAC Admin
          </div>

          <div className="truncate text-xs font-semibold text-slate-500">
            {adminName}
          </div>
        </div>
      </div>

      <div
        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
          role === 'superadmin'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {roleLabel}
      </div>
    </div>
  );

  /* =======================================================
     LIMITED ROLE NOTICE
  ======================================================= */

  const LimitedRoleNotice = () =>
    limitedRole ? (
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <div className="mb-1 text-xs font-bold text-blue-700">
          Limited Role
        </div>

        <p className="text-[11px] leading-relaxed text-blue-600">
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

      <ul className="space-y-1">
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
                }) =>
                  [
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',

                    isLinkActive(
                      item,
                      isActive
                    )
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="truncate">
                  {item.label}
                </span>
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
          MOBILE TOP BAR
      =============================================== */}

      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003580] text-sm font-bold text-white shadow-sm">
            IA
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">
              IAAC Admin
            </div>

            <div className="truncate text-xs font-semibold text-slate-500">
              {adminName}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(true)
          }
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ===============================================
          DESKTOP SIDEBAR
      =============================================== */}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
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
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close admin menu"
            onClick={
              closeMobileMenu
            }
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[86vw] overflow-y-auto bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <span className="text-sm font-bold text-slate-900">
                Admin Menu
              </span>

              <button
                type="button"
                onClick={
                  closeMobileMenu
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                aria-label="Close admin menu"
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