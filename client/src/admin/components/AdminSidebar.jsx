import {
  BookOpen,
  Calendar,
  LayoutDashboard,
  Users,
  GraduationCap,
  Video,
  Library,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', icon: Users, superAdminOnly: true },
  { label: 'Students', to: '/admin/students', icon: GraduationCap },
  { label: 'Course Overview', to: '/admin/course-overview', icon: BookOpen, superAdminOnly: true },
  { label: 'Class Schedule', to: '/admin/schedule', icon: Calendar },
  { label: 'Recordings', to: '/admin/recordings', icon: Video, superAdminOnly: true },
  { label: 'Knowledge Hub', to: '/admin/knowledge-hub', icon: Library, superAdminOnly: true },
  { label: 'Feedback', to: '/admin/feedback', icon: Library, superAdminOnly: true },
];

export default function AdminSidebar({ admin }) {
  const location = useLocation();
  const role = admin?.role || 'staff';
  const nav = NAV.filter((item) => !item.superAdminOnly || role === 'superadmin');

  const limitedRole = role === 'staff' || role === 'lecturer';
  const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'lecturer' ? 'Lecturer' : 'Staff Admin';

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003580] font-bold text-white">
          IA
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">IAAC Admin</div>
          <div className="truncate text-[11px] font-semibold text-slate-500">{admin?.name || 'Admin'}</div>
          <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${
            role === 'superadmin' 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {roleLabel}
          </div>
        </div>
      </div>

      <nav className="p-3">
        {limitedRole && (
          <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="text-xs font-semibold text-blue-700 mb-1">Limited Role</div>
            <div className="text-[10px] text-blue-600">
              You can add materials and schedules but cannot edit/delete existing content or manage users.
            </div>
          </div>
        )}
        
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  (() => {
                    const isAdminIndex = item.to === '/admin';

                    const active =
                      (isAdminIndex && location.pathname === '/admin') ||
                      (item.to === '/admin/students' && location.pathname.startsWith('/admin/students'));

                    const isReallyActive = active || isActive;

                    return (
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ` +
                      (isReallyActive
                        ? 'bg-sky-50 text-sky-700'
                        : 'text-slate-700 hover:bg-slate-50')
                    );
                  })()
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
