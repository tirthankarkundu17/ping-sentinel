import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../lib/api";

export default function MonitorDetailsPage() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState(null);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/monitors/${id}/details`);
        setMonitor(data.monitor);
        setChecks(data.checks || []);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load monitor details");
      }
    };
    load();
  }, [id]);

  const graphData = useMemo(
    () =>
      [...checks]
        .reverse()
        .map((c) => ({
          time: new Date(c.timestamp).toLocaleTimeString(),
          response_time_ms: c.response_time_ms,
          status_value: c.status === "UP" ? 1 : 0,
        })),
    [checks]
  );

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!monitor) return <p className="text-slate-600">Loading...</p>;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{monitor.name}</h2>
             <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  monitor.last_status === "UP"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                    : monitor.last_status === "DOWN"
                    ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10"
                    : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10"
                }`}
              >
                {monitor.last_status === "UP" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>}
                {monitor.last_status === "DOWN" && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></div>}
                {monitor.last_status || "UNKNOWN"}
              </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
             <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{monitor.method}</span>
             <a href={monitor.url} target="_blank" rel="noreferrer" className="hover:text-brand-600 truncate max-w-[280px] sm:max-w-md">{monitor.url}</a>
          </div>
        </div>
        <Link to="/monitors" className="inline-flex justify-center items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors w-full sm:w-auto">
          &larr; Back to monitors
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Interval" value={`${monitor.check_interval_seconds}s`} />
        <Card
          title="Last Response"
          value={
            monitor.last_response_time_ms ? `${monitor.last_response_time_ms} ms` : "-"
          }
        />
        <Card
          title="Last Check"
          value={monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString() : "-"}
        />
        <Card title="Uptime %" value={`${monitor.uptime_percent}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Response Time History">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" minTickGap={32} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="response_time_ms" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status History">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" minTickGap={32} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis domain={[0, 1]} ticks={[0, 1]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => val === 1 ? 'UP' : 'DOWN'} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                formatter={(val) => [val === 1 ? 'UP' : 'DOWN', 'Status']}
              />
              <Line type="stepAfter" dataKey="status_value" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="border-b border-slate-200/60 bg-slate-50/50 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Last 50 Checks</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Timestamp</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 text-right">Response Time</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 text-center">HTTP Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {checks.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-slate-600">{new Date(c.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</td>
                  <td className="px-5 py-3">
                     <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          c.status === "UP"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                            : c.status === "DOWN"
                            ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10"
                            : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10"
                        }`}
                      >
                        {c.status}
                      </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-right">{c.response_time_ms ? `${c.response_time_ms}ms` : "-"}</td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-center">
                    {c.http_status ? (
                       <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${c.http_status >= 200 && c.http_status < 300 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                         {c.http_status}
                       </span>
                    ) : "-"}
                  </td>
                  <td className="px-5 py-3 text-red-500 text-xs max-w-[200px] truncate" title={c.error_message}>{c.error_message || "-"}</td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                    No checks recorded yet. Wait for the interval to pass.
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

function Card({ title, value }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50/50 blur-2xl"></div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
      <h3 className="mb-6 font-semibold tracking-tight text-slate-800">{title}</h3>
      <div className="-ml-3 -mr-2">
        {children}
      </div>
    </div>
  );
}
