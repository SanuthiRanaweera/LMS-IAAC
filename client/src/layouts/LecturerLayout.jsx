import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  FileUp,
  ClipboardList,
  Video,
  Library,
  MessageSquare,
  MessageSquareText,
  CircleUserRound,
  LogOut,
  CircleHelp,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';
import { apiGet, apiPost } from '../api/http.js';
import logo from '../image/logo.png';

const MAIN_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/lecturer/dashboard' },
  { label: 'Class Schedule', icon: CalendarDays, to: '/lecturer/schedule' },
  { label: 'Study Materials', icon: FileText, to: '/lecturer/materials' },
  { label: 'Assignments', icon: ClipboardList, to: '/lecturer/assignments' },
];

const SECONDARY_NAV = [
  { label: 'Lecture Recordings', icon: Video, to: '/lecturer/recordings' },
  { label: 'Knowledge Hub', icon: Library, to: '/lecturer/knowledge-hub' },
  { label: 'My Feedback', icon: MessageSquareText, to: '/lecturer/feedback-reports' },
];

export default function LecturerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lecturer, setLecturer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const data = await apiGet('/api/auth/me');
        if (cancelled) return;

        if (data?.role === 'lecturer') {
          setLecturer(data);
          setAuthChecked(true);
          return;
        }

        if (data?.role === 'superadmin' || data?.role === 'staff') {
          navigate('/admin', { replace: true });
          return;
        }

        navigate('/login', { replace: true });
      } catch {
        try {
          const adminData = await apiGet('/api/admin/auth/me');
          if (cancelled) return;

          const role = adminData?.role || adminData?.admin?.role;
          if (role === 'lecturer') {
            setLecturer(adminData?.admin || adminData);
            setAuthChecked(true);
            return;
          }

          if (role === 'superadmin' || role === 'staff') {
            navigate('/admin', { replace: true });
            return;
          }

          navigate('/login', { replace: true });
        } catch {
          if (!cancelled) {
            navigate('/login', { replace: true });
          }
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    try {
      await Promise.allSettled([
        apiPost('/api/auth/logout'),
        apiPost('/api/admin/auth/logout'),
      ]);
    } finally {
      setLecturer(null);
      navigate('/login', { replace: true });
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] font-sans">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-lg">
          <LoaderCircle
            className="mx-auto mb-3 h-8 w-8 animate-spin text-[#173B75]"
            strokeWidth={2}
            aria-hidden="true"
          />
          <p className="text-base font-bold text-slate-800">Loading IAAC Lecturer Portal...</p>
          <p className="mt-1 text-xs text-slate-500">Connecting securely to college records</p>
        </div>
      </div>
    );
  }

  const initials = lecturer?.name
    ? lecturer.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'L';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased">
      {/* ====================================================
          TOPBAR (Fixed for accessibility & mobile toggle)
      ==================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left: Mobile hamburger & branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-100 shadow-2xs">
                <img src={logo} alt="IAAC College Logo" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-extrabold text-[#173B75] tracking-tight leading-none">
                  IAAC Lecturer Portal
                </span>
                <span className="block text-[11px] font-medium text-slate-500 leading-tight">
                  International Airline & Aviation College
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Help Button */}
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-[#173B75] hover:bg-blue-100 transition cursor-pointer"
              title="Click for step-by-step guidance"
            >
              <CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Help Center</span>
            </button>

            {/* Profile Pill */}
            <NavLink
              to="/lecturer/profile"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition"
              title="View my profile"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173B75] text-xs font-extrabold text-white shadow-2xs">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{lecturer?.name || 'Lecturer'}</p>
                <p className="text-[10px] font-semibold text-emerald-700 leading-tight flex items-center gap-1">
                  <CheckCircle2 size={12} strokeWidth={2} className="text-emerald-600" aria-hidden="true" />
                  Active Lecturer
                </p>
              </div>
            </NavLink>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
              title="Sign out of IAAC Lecturer Portal"
            >
              <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* ====================================================
            SIDEBAR (Desktop Fixed, Mobile Drawer)
        ==================================================== */}
        <aside
          className={`fixed inset-y-16 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
          }`}
        >
          <div className="flex h-full flex-col justify-between overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Lecturer Identity Card */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-slate-50 p-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CircleUserRound size={16} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Logged In Lecturer</p>
                </div>
                <p className="mt-1.5 text-sm font-extrabold text-slate-900 leading-tight truncate">
                  {lecturer?.name || 'Lecturer'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200/80">
                    Lecturer
                  </span>
                  {lecturer?.subject ? (
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                      {lecturer.subject}
                    </span>
                  ) : null}
                  {lecturer?.batchId ? (
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                      Batch {lecturer.batchId}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* MAIN MENU */}
              <div>
                <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Main Menu
                </p>
                <nav className="space-y-1">
                  {MAIN_NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-[#173B75] text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <item.icon size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* SECONDARY RESOURCES */}
              <div>
                <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Learning Resources
                </p>
                <nav className="space-y-1">
                  {SECONDARY_NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50 text-[#173B75] font-bold border-l-4 border-[#173B75]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <item.icon size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>

            {/* Bottom: Profile & Help Shortcut */}
            <div className="border-t border-slate-100 pt-4 space-y-1">
              <NavLink
                to="/lecturer/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isActive ? 'bg-slate-100 text-[#173B75]' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <CircleUserRound size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>My Profile</span>
              </NavLink>

              <button
                type="button"
                onClick={() => setHelpModalOpen(true)}
                className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 text-left cursor-pointer"
              >
                <CircleHelp size={18} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                <span>Help Center</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-2xs lg:hidden"
          />
        )}

        {/* ====================================================
            MAIN PAGE CONTENT
        ==================================================== */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ lecturer, setLecturer }} />
        </main>
      </div>

      {/* ====================================================
          HELP CENTER MODAL (Pure Lucide Icons, No Emojis)
      ==================================================== */}
      {helpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#173B75]">
                  <CircleHelp size={24} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Lecturer Help Center</h3>
                  <p className="text-xs text-slate-500">Step-by-step instructions for completing academic duties</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Close help guide"
              >
                <X size={20} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-sm text-slate-700">
              {/* Guide 1: Study Materials */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                  <FileText size={18} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                  <span>How to Upload Study Materials</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-1 font-medium">
                  <li>Click <strong>Study Materials</strong> in the sidebar.</li>
                  <li>Click the <strong>Upload Material</strong> button.</li>
                  <li>Select your Course, Batch, and Module from the dropdowns.</li>
                  <li>Type a clear title for the material and choose your file (PDF, PPTX, DOCX, or Image).</li>
                  <li>Click <strong>Upload Material</strong> to publish it immediately for your students.</li>
                </ol>
              </div>

              {/* Guide 2: Class Schedule */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                  <CalendarDays size={18} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                  <span>How to Check Your Class Schedule</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-1 font-medium">
                  <li>Click <strong>Class Schedule</strong> in the sidebar.</li>
                  <li>Review upcoming class dates, subject modules, timeslots, and classroom locations.</li>
                  <li>Use the filter buttons (Today, This Week, All) to view sessions at a glance.</li>
                </ol>
              </div>

              {/* Guide 3: Assignments */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                  <ClipboardList size={18} strokeWidth={1.8} className="text-[#173B75]" aria-hidden="true" />
                  <span>How to Create and Review Assignments</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-1 font-medium">
                  <li>Click <strong>Assignments</strong> in the sidebar.</li>
                  <li>Click <strong>Create Assignment</strong> and fill in the title, instructions, and deadline.</li>
                  <li>Once created, students can upload their submissions before the deadline.</li>
                  <li>Click <strong>View Submissions</strong> on any assignment to download and review student work.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="rounded-xl bg-[#173B75] px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-900 cursor-pointer shadow-md"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
