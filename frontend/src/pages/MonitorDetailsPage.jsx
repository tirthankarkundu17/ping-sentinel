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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{monitor.name}</h2>
          <p className="text-sm text-slate-600">{monitor.url}</p>
        </div>
        <Link to="/monitors" className="text-sm text-brand-700">
          Back to monitors
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Current Status" value={monitor.last_status || "UNKNOWN"} />
        <Card
          title="Last Response"
          value={
            monitor.last_response_time_ms ? `${monitor.last_response_time_ms} ms` : "-"
          }
        />
        <Card
          title="Last Check"
          value={monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleString() : "-"}
        />
        <Card title="Method" value={monitor.method} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Response Time History">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" minTickGap={32} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="response_time_ms" stroke="#0f7dcc" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status History (1=UP, 0=DOWN)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" minTickGap={32} />
              <YAxis domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip />
              <Line type="stepAfter" dataKey="status_value" stroke="#16a34a" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-800">Last 50 Checks</h3>
        </div>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Timestamp</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Response Time</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">HTTP Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {checks.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-slate-600">{new Date(c.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{c.status}</td>
                <td className="px-4 py-3 text-slate-600">{c.response_time_ms || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{c.http_status || "-"}</td>
                <td className="px-4 py-3 text-red-600">{c.error_message || "-"}</td>
              </tr>
            ))}
            {checks.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No checks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}
