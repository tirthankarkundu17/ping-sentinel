import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

function MetricCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <Link
          to="/monitors"
          className="rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white"
        >
          Manage Monitors
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Monitors" value={overview.total_monitors} />
          <MetricCard title="Monitors UP" value={overview.monitors_up} />
          <MetricCard title="Monitors DOWN" value={overview.monitors_down} />
          <MetricCard
            title="Avg Response Time"
            value={
              overview.avg_response_time_ms
                ? `${Math.round(overview.avg_response_time_ms)} ms`
                : "-"
            }
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">URL</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Check</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Response Time</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Uptime %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitors.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <Link className="text-brand-700" to={`/monitors/${m.id}`}>
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.url}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      m.status === "UP"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.status || "UNKNOWN"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.last_check ? new Date(m.last_check).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.response_time_ms ? `${m.response_time_ms} ms` : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">{m.uptime_percent}%</td>
              </tr>
            ))}
            {monitors.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No monitors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
