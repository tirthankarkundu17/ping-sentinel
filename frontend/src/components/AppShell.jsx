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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">PingSentinel</h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <nav className="flex items-center gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-brand-700" : "text-slate-600"}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/monitors"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-brand-700" : "text-slate-600"}`
              }
            >
              Monitors
            </NavLink>
            <button
              onClick={handleLogout}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
