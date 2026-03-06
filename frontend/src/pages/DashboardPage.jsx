import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

function MetricCard({ title, value, icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50/50 blur-2xl"></div>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, monitorsRes] = await Promise.all([
          api.get("/dashboard/overview"),
          api.get("/dashboard/monitors"),
        ]);
        setOverview(overviewRes.data);
        setMonitors(monitorsRes.data);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load dashboard");
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Overview of your systems</p>
        </div>
        <Link
          to="/monitors"
          className="inline-flex justify-center items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 w-full sm:w-auto"
        >
          Manage Monitors
        </Link>
      </div>
      
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200 shadow-sm">
          {error}
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Monitors" value={overview.total_monitors} 
            icon={<svg className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>} />
          <MetricCard title="Monitors UP" value={overview.monitors_up} 
            icon={<svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
          <MetricCard title="Monitors DOWN" value={overview.monitors_down} 
            icon={<svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" /></svg>} />
          <MetricCard
            title="Avg Response Time"
            value={
              overview.avg_response_time_ms
                ? `${Math.round(overview.avg_response_time_ms)} ms`
                : "-"
            }
            icon={<svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
          />
        </div>
      )}

      <div className="rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Your Monitors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Name</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden sm:table-cell">URL</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Last Check</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 text-right">Response Time</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 text-right">Uptime %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {monitors.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link className="text-brand-600 font-medium hover:text-brand-800" to={`/monitors/${m.id}`}>
                      {m.name}
                    </Link>
                    {/* Show URL underneath name strictly on very small screens, where URL column is hidden */}
                    <div className="text-xs text-slate-500 mt-1 sm:hidden truncate max-w-[150px]">{m.url}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 hidden sm:table-cell truncate max-w-[200px]" title={m.url}>{m.url}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        m.status === "UP"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                          : m.status === "DOWN"
                          ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10"
                          : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10"
                      }`}
                    >
                      {m.status === "UP" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>}
                      {m.status === "DOWN" && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></div>}
                      {m.status || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                    {m.last_check ? new Date(m.last_check).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-mono text-right">
                    {m.response_time_ms ? `${m.response_time_ms}ms` : "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium text-right">{m.uptime_percent}%</td>
                </tr>
              ))}
              {monitors.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                    <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium text-slate-900">No monitors yet</p>
                    <p className="mt-1">Get started by creating a new monitor.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
