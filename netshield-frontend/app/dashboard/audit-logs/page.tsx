"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Topbar from "../Topbar";

type AuditLog = {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  details: string | null;
  timestamp: string;
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-signal",
  signup: "text-signal",
  role_change: "text-alert",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get("/audit-logs?limit=100");
      setLogs(res.data);
      setError("");
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "Administrator access required to view this page."
          : "Unable to load audit logs."
      );
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return (
    <div className="min-h-screen">
      <Topbar title="Audit Logs" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-md px-4 py-3 mb-6 font-mono">
            {error}
          </div>
        )}

        <div className="bg-panel border border-line rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">
              System Activity ({logs.length} recent events)
            </h2>
          </div>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-muted text-xs uppercase border-b border-line">
                <th className="text-left px-5 py-2.5 font-medium">Timestamp</th>
                <th className="text-left px-5 py-2.5 font-medium">User</th>
                <th className="text-left px-5 py-2.5 font-medium">Action</th>
                <th className="text-left px-5 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line/50 hover:bg-panel2 transition-colors">
                  <td className="px-5 py-2.5 text-muted whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5 text-text">{log.user_email || "—"}</td>
                  <td className="px-5 py-2.5">
                    <span className={`uppercase text-xs ${ACTION_COLORS[log.action] || "text-muted"}`}>
                      {log.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted">{log.details || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted">
                    No audit events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
