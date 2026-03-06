import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MonitorForm from "../components/MonitorForm";
import api from "../lib/api";
import LogoIcon from "../components/LogoIcon";

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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Monitors</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your endpoints and websites</p>
        </div>
        <button
          onClick={() => {
            setEditingMonitor(null);
            setShowForm((v) => !v);
          }}
          className="inline-flex justify-center items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 w-full sm:w-auto"
        >
          {showForm ? "Close Form" : "Create Monitor"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/60 p-1">
          <MonitorForm
            initialValue={editingMonitor}
            onSubmit={handleCreateOrUpdate}
            onCancel={() => {
              setShowForm(false);
              setEditingMonitor(null);
            }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200 shadow-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/60 bg-slate-50/50">
           <h3 className="font-semibold text-slate-800">All Monitors</h3>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-slate-500 flex justify-center items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Loading monitors...</span>
          </div>
        ) : monitors.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              <LogoIcon className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-900">No monitors created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {monitors.map((m) => (
              <div key={m.id} className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md ${!m.enabled ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{m.method}</span>
                      <Link className="text-lg font-semibold text-slate-900 group-hover:text-brand-600 truncate block" to={`/monitors/${m.id}`}>
                        {m.name}
                      </Link>
                    </div>
                    <p className="truncate text-sm text-slate-500 border-b border-transparent group-hover:border-slate-200 inline-block transition-colors pb-0.5" title={m.url}>{m.url}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      !m.enabled ? "bg-slate-100 text-slate-500" :
                      m.last_status === "UP"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                        : m.last_status === "DOWN"
                        ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10"
                        : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/10"
                    }`}
                  >
                    {m.enabled && m.last_status === "UP" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div>}
                    {m.enabled && m.last_status === "DOWN" && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></div>}
                    {!m.enabled ? "PAUSED" : (m.last_status || "UNKNOWN")}
                  </span>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 font-medium">Interval</span>
                     <span className="text-slate-700 font-mono font-semibold">{m.check_interval_seconds}s</span>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setEditingMonitor(m);
                        setShowForm(true);
                      }}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(m.id, m.enabled)}
                      className={`rounded-md bg-white px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-inset transition-colors ${m.enabled ? 'text-slate-700 ring-slate-300 hover:bg-slate-50' : 'text-brand-700 ring-brand-300 hover:bg-brand-50'}`}
                    >
                        {m.enabled ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 transition-colors ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
