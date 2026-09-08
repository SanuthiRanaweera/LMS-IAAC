import { Bell, LogOut } from 'lucide-react';

export default function AdminTopbar({ admin, onLogout, dark = false }) {
  return (
    <header className={`sticky top-0 z-40 w-full border-b ${dark ? 'border-white/10 bg-[#101010]' : 'border-slate-200 bg-white'}`}>
      <div className="mx-auto flex h-16 items-center justify-between px-5">
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${dark ? 'text-white/60' : 'text-slate-700'}`}>
            Hello {admin?.name || 'Admin'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className={`rounded-full p-2 ${dark ? 'text-white/50 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
