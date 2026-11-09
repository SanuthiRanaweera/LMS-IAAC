import defaultLogo from '../image/logo.png';

/**
 * Role branding configuration for IAAC LMS
 */
export const ROLE_CONFIG = {
  superadmin: {
    title: 'IAAC Super Admin',
    label: 'Super Admin',
    badgeClass: 'bg-violet-100 text-violet-700 border border-violet-200/80',
  },
  admin: {
    title: 'IAAC Admin Portal',
    label: 'Admin',
    badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200/80',
  },
  lecturer: {
    title: 'IAAC Lecturer Portal',
    label: 'Lecturer',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200/80',
  },
  student: {
    title: 'IAAC Student Portal',
    label: 'Student',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/80',
  },
};

/**
 * Normalize role string to one of the standard keys:
 * 'superadmin' | 'admin' | 'lecturer' | 'student'
 */
export function normalizeUserRole(rawRole) {
  const normalized = String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'superadmin' || normalized === 'super' || normalized === 'superadministrator') {
    return 'superadmin';
  }
  if (normalized === 'lecturer' || normalized === 'lecture' || normalized === 'teacher') {
    return 'lecturer';
  }
  if (normalized === 'student' || normalized === 'learner') {
    return 'student';
  }
  if (normalized === 'admin' || normalized === 'staff' || normalized === 'staffadmin') {
    return 'admin';
  }

  return 'admin';
}

/**
 * SidebarBrandHeader
 *
 * Professional, role-aware sidebar header with official IAAC branding.
 */
export default function SidebarBrandHeader({
  user = null,
  role = null,
  displayName = null,
  logoSrc = null,
  dark = false,
  collapsed = false,
  className = '',
}) {
  const activeRole = normalizeUserRole(
    role ||
    user?.role ||
    user?.admin?.role ||
    user?.student?.role
  );

  const branding = ROLE_CONFIG[activeRole] || ROLE_CONFIG.admin;

  const resolvedName =
    displayName ||
    user?.name ||
    user?.fullName ||
    user?.admin?.name ||
    user?.student?.fullName ||
    branding.label;

  const resolvedLogo = logoSrc || defaultLogo;

  if (collapsed) {
    return (
      <div
        className={`flex items-center justify-center border-b p-3 ${
          dark ? 'border-white/10 bg-[#101010]' : 'border-slate-200 bg-white'
        } ${className}`}
        title={`${branding.title} – ${resolvedName} (${branding.label})`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 border border-slate-100 shadow-2xs">
          <img
            src={resolvedLogo}
            alt="IAAC College Logo"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-4 py-4 transition-colors ${
        dark ? 'border-white/10 bg-[#101010]' : 'border-slate-200 bg-white'
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Official IAAC College Logo */}
        <div className="flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-100 shadow-2xs">
          <img
            src={resolvedLogo}
            alt="IAAC College Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Portal Title, User Name & Role Badge */}
        <div className="min-w-0 flex-1">
          <h1
            className={`truncate text-sm font-extrabold tracking-tight ${
              dark ? 'text-white' : 'text-[#003580]'
            }`}
          >
            {branding.title}
          </h1>

          <p
            className={`truncate text-xs font-semibold mt-0.5 ${
              dark ? 'text-white/65' : 'text-slate-600'
            }`}
            title={resolvedName}
          >
            {resolvedName}
          </p>

          <div className="mt-1.5 flex items-center">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${branding.badgeClass}`}
            >
              {branding.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
