import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MonitorForm from "../components/MonitorForm";
import api from "../lib/api";

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadMonitors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/monitors");
      setMonitors(data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load monitors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors();
  }, []);

  const handleCreateOrUpdate = async (payload) => {
    if (editingMonitor) {
      await api.put(`/monitors/${editingMonitor.id}`, payload);
    } else {
      await api.post("/monitors", payload);
    }
    setShowForm(false);
    setEditingMonitor(null);
    loadMonitors();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this monitor?")) return;
    await api.delete(`/monitors/${id}`);
    loadMonitors();
  };

  const handleToggle = async (id, enabled) => {
    await api.patch(`/monitors/${id}/toggle`, { enabled: !enabled });
    loadMonitors();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Monitors</h2>
        <button
          onClick={() => {
            setEditingMonitor(null);
            setShowForm((v) => !v);
          }}
          className="rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white"
        >
          {showForm ? "Close" : "Create Monitor"}
        </button>
      </div>

      {showForm && (
        <MonitorForm
          initialValue={editingMonitor}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingMonitor(null);
          }}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">URL</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Method</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Interval</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : monitors.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No monitors created.
                </td>
              </tr>
            ) : (
              monitors.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <Link className="text-brand-700" to={`/monitors/${m.id}`}>
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.url}</td>
                  <td className="px-4 py-3 text-slate-600">{m.method}</td>
                  <td className="px-4 py-3 text-slate-600">{m.check_interval_seconds}s</td>
                  <td className="px-4 py-3 text-slate-600">{m.last_status || "UNKNOWN"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setEditingMonitor(m);
                          setShowForm(true);
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(m.id, m.enabled)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {m.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
