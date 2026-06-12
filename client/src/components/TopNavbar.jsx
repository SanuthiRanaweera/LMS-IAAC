import { 
  LayoutDashboard, 
  Library, 
  Calendar, 
  FileText,
  Video, 
  Bell, 
  LogOut 
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
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-full px-6">
        <div className="flex h-16 items-center justify-between">
          
          {/* 1. Branding Section */}
          <div className="flex items-center pr-8 border-r border-slate-100">
            <img src={logo} alt="IAAC Logo" className="h-10 w-auto object-contain" />
          </div>

          {/* 2. Main Navigation - No Search Bar = More Space */}
          <nav className="flex flex-1 items-center justify-center gap-2">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-sky-50 text-sky-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* 3. Utility Actions (Notifications & Profile) */}
          <div className="flex items-center gap-4 pl-8">
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sky-800 shadow-sm transition-colors hover:bg-sky-100"
            >
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-700">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500"></span>
              </span>
              <span className="hidden text-sm font-semibold md:inline">Notifications</span>
            </button>

            {/* Profile Section */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4 py-1">
              <div className="text-right hidden md:block">
                <NavLink to="/profile" className="text-xs font-bold text-slate-900 hover:underline">
                  {student?.name || ' User '}
                </NavLink>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-semibold flex items-center gap-1 ml-auto"
                >
                  <LogOut className="h-3 w-3" /> Log Out
                </button>
              </div>
              <NavLink
                to="/profile"
                className="h-9 w-9 rounded-full border-2 border-sky-100 p-0.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
                aria-label="Open profile"
              >
                <img 
                  src={
                      student?.avatarDataUri || 
                      student?.avatar || 
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || 'User')}&background=0369a1&color=fff`
                   }  
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