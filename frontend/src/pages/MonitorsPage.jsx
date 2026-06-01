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
  const [importStatus, setImportStatus] = useState(null);

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

  const exportToCSV = (monitorsList) => {
    const headers = [
      "name",
      "url",
      "type",
      "method",
      "expected_status_code",
      "expected_response_time_ms",
      "check_interval_seconds",
      "headers",
      "request_body",
      "expected_body_contains",
      "slack_webhook_url",
      "enabled"
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(",")];

    for (const m of monitorsList) {
      let headersStr = m.headers || "{}";
      if (typeof headersStr === "object") {
        headersStr = JSON.stringify(headersStr);
      }
      const row = [
        escapeCSV(m.name),
        escapeCSV(m.url),
        escapeCSV(m.type),
        escapeCSV(m.method),
        escapeCSV(m.expected_status_code),
        escapeCSV(m.expected_response_time_ms),
        escapeCSV(m.check_interval_seconds),
        escapeCSV(headersStr),
        escapeCSV(m.request_body),
        escapeCSV(m.expected_body_contains),
        escapeCSV(m.slack_webhook_url),
        escapeCSV(m.enabled ? "true" : "false")
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `monitors_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  const parseImportedMonitors = (text) => {
    const lines = parseCSV(text);
    if (lines.length <= 1) return { error: "CSV file is empty or has no data." };

    const headerRow = lines[0].map(h => h.trim().toLowerCase());
    const required = ["name", "url", "type", "method", "check_interval_seconds"];

    const indices = {};
    for (const field of ["name", "url", "type", "method", "expected_status_code", "expected_response_time_ms", "check_interval_seconds", "headers", "request_body", "expected_body_contains", "slack_webhook_url", "enabled"]) {
      indices[field] = headerRow.indexOf(field);
    }

    for (const req of required) {
      if (indices[req] === -1) {
        return { error: `Missing required column: "${req}"` };
      }
    }

    const monitorsToCreate = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length === 1 && row[0] === "") continue;

      const getValue = (field) => {
        const idx = indices[field];
        return idx !== -1 && idx < row.length ? row[idx] : undefined;
      };

      const name = (getValue("name") || "").trim();
      const urlVal = (getValue("url") || "").trim();
      const typeVal = (getValue("type") || "").trim().toLowerCase();
      const methodVal = (getValue("method") || "GET").trim().toUpperCase();
      const statusCodeVal = getValue("expected_status_code");
      const responseTimeVal = getValue("expected_response_time_ms");
      const intervalVal = getValue("check_interval_seconds");
      const headersRaw = getValue("headers");
      const requestBodyVal = getValue("request_body");
      const bodyContainsVal = getValue("expected_body_contains");
      const slackWebhookUrlVal = getValue("slack_webhook_url");
      const enabledRaw = getValue("enabled");

      if (!name || !urlVal) {
        return { error: `Row ${i + 1}: Name and URL are required.` };
      }

      if (typeVal !== "website" && typeVal !== "api") {
        return { error: `Row ${i + 1}: Type must be 'website' or 'api'. Got '${typeVal}'` };
      }

      const validMethods = ["GET", "POST", "PUT", "DELETE"];
      if (!validMethods.includes(methodVal)) {
        return { error: `Row ${i + 1}: Method must be GET, POST, PUT, or DELETE. Got '${methodVal}'` };
      }

      const checkIntervalSeconds = parseInt(intervalVal, 10);
      if (isNaN(checkIntervalSeconds) || checkIntervalSeconds < 5 || checkIntervalSeconds > 86400) {
        return { error: `Row ${i + 1}: Check interval must be a number between 5 and 86400. Got '${intervalVal}'` };
      }

      const expectedStatusCode = statusCodeVal ? parseInt(statusCodeVal, 10) : 200;
      if (isNaN(expectedStatusCode) || expectedStatusCode < 100 || expectedStatusCode > 599) {
        return { error: `Row ${i + 1}: Expected status code must be a number between 100 and 599.` };
      }

      const expectedResponseTimeMS = responseTimeVal ? parseInt(responseTimeVal, 10) : 1000;
      if (isNaN(expectedResponseTimeMS) || expectedResponseTimeMS <= 0) {
        return { error: `Row ${i + 1}: Expected response time must be a positive number.` };
      }

      let headersObj = {};
      if (headersRaw && headersRaw.trim() !== "") {
        try {
          headersObj = JSON.parse(headersRaw);
        } catch {
          try {
            headersObj = JSON.parse(headersRaw.replace(/'/g, '"'));
          } catch {
            return { error: `Row ${i + 1}: Headers must be valid JSON. Got '${headersRaw}'` };
          }
        }
      }

      const enabled = enabledRaw !== undefined ? (enabledRaw.trim().toLowerCase() === "true" || enabledRaw.trim() === "1") : true;

      monitorsToCreate.push({
        name,
        url: urlVal,
        type: typeVal,
        method: methodVal,
        expected_status_code: expectedStatusCode,
        expected_response_time_ms: expectedResponseTimeMS,
        check_interval_seconds: checkIntervalSeconds,
        headers: headersObj,
        request_body: requestBodyVal || null,
        expected_body_contains: bodyContainsVal || null,
        slack_webhook_url: slackWebhookUrlVal || null,
        enabled
      });
    }

    return { monitors: monitorsToCreate };
  };

  const handleImportCSVClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const result = parseImportedMonitors(text);
        if (result.error) {
          setImportStatus({ type: "error", message: result.error });
          return;
        }

        const { monitors: list } = result;
        setImportStatus({ type: "loading", message: `Importing ${list.length} monitors...` });

        let successCount = 0;
        let failCount = 0;
        const failures = [];

        for (const m of list) {
          try {
            await api.post("/monitors", m);
            successCount++;
          } catch (err) {
            failCount++;
            failures.push(`${m.name}: ${err?.response?.data?.error || err.message}`);
          }
        }

        if (failCount === 0) {
          setImportStatus({
            type: "success",
            message: `Successfully imported all ${successCount} monitors!`
          });
        } else {
          setImportStatus({
            type: "warning",
            message: `Import completed: ${successCount} imported successfully, ${failCount} failed.`,
            details: failures
          });
        }
        loadMonitors();
      };
      reader.readAsText(file);
    };
    input.click();
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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportToCSV(monitors)}
            className="inline-flex justify-center items-center rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 flex-1 sm:flex-initial"
          >
            Export CSV
          </button>
          <button
            onClick={handleImportCSVClick}
            className="inline-flex justify-center items-center rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 flex-1 sm:flex-initial"
          >
            Import CSV
          </button>
          <button
            onClick={() => {
              setEditingMonitor(null);
              setShowForm((v) => !v);
            }}
            className="inline-flex justify-center items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 flex-1 sm:flex-initial"
          >
            {showForm ? "Close Form" : "Create Monitor"}
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`rounded-lg border p-4 text-sm shadow-sm relative animate-in fade-in duration-300 ${
          importStatus.type === "loading" ? "bg-blue-50 text-blue-800 border-blue-200" :
          importStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          importStatus.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
          "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          <button
            onClick={() => setImportStatus(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
          >
            &times;
          </button>
          <div className="flex items-start">
            {importStatus.type === "loading" && (
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            )}
            <div>
              <p className="font-semibold">{importStatus.message}</p>
              {importStatus.details && importStatus.details.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs opacity-90 max-h-32 overflow-y-auto">
                  {importStatus.details.map((fail, idx) => (
                    <li key={idx}>{fail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
