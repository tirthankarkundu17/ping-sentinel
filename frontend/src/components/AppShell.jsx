import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] selection:bg-brand-500/30">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight text-slate-900">PingSentinel</h1>
               <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 hidden sm:block">{user?.email}</p>
             </div>
          </div>
          <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-4 overflow-x-auto">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/monitors"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
              }
            >
              Monitors
            </NavLink>
            <button
              onClick={handleLogout}
              className="ml-2 inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
         <div className="relative">
            {children}
         </div>
      </main>
    </div>
  );
}
