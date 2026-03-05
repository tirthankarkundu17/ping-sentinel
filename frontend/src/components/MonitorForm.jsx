import { useMemo, useState } from "react";

const intervals = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "10 minutes", value: 600 },
];

const defaultMonitor = {
  name: "",
  url: "",
  type: "website",
  method: "GET",
  expected_status_code: 200,
  expected_response_time_ms: 1000,
  check_interval_seconds: 60,
  headers: "{}",
  request_body: "",
  expected_body_contains: "",
  enabled: true,
};

export default function MonitorForm({ initialValue, onSubmit, onCancel }) {
  const [form, setForm] = useState(() =>
    initialValue
      ? {
          ...initialValue,
          headers: initialValue.headers || "{}",
          request_body: initialValue.request_body || "",
          expected_body_contains: initialValue.expected_body_contains || "",
        }
      : defaultMonitor
  );
  const [error, setError] = useState("");
  const title = useMemo(() => (initialValue ? "Edit Monitor" : "New Monitor"), [initialValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let headersObj;
    try {
      headersObj = JSON.parse(form.headers || "{}");
    } catch {
      setError("Headers must be a valid JSON object.");
      return;
    }

    await onSubmit({
      ...form,
      headers: headersObj,
      expected_status_code: Number(form.expected_status_code),
      expected_response_time_ms: Number(form.expected_response_time_ms),
      check_interval_seconds: Number(form.check_interval_seconds),
      request_body: form.request_body || null,
      expected_body_contains: form.expected_body_contains || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-slate-500">
            Cancel
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="URL / Endpoint">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
        </Field>
        <Field label="Type">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="website">Website</option>
            <option value="api">API</option>
          </select>
        </Field>
        <Field label="HTTP Method">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </Field>
        <Field label="Expected Status Code">
          <input
            type="number"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.expected_status_code}
            onChange={(e) => setForm({ ...form, expected_status_code: e.target.value })}
            required
          />
        </Field>
        <Field label="Expected Response Time (ms)">
          <input
            type="number"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.expected_response_time_ms}
            onChange={(e) => setForm({ ...form, expected_response_time_ms: e.target.value })}
            required
          />
        </Field>
        <Field label="Check Interval">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.check_interval_seconds}
            onChange={(e) => setForm({ ...form, check_interval_seconds: e.target.value })}
          >
            {intervals.map((it) => (
              <option key={it.value} value={it.value}>
                {it.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Enabled">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
        </Field>
      </div>

      <Field label="Headers (JSON)">
        <textarea
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          value={form.headers}
          onChange={(e) => setForm({ ...form, headers: e.target.value })}
        />
      </Field>

      {form.method !== "GET" && (
        <Field label="Request Body (optional)">
          <textarea
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            value={form.request_body}
            onChange={(e) => setForm({ ...form, request_body: e.target.value })}
          />
        </Field>
      )}

      <Field label="Expected Body Contains (optional)">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={form.expected_body_contains}
          onChange={(e) => setForm({ ...form, expected_body_contains: e.target.value })}
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white" type="submit">
        Save Monitor
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
