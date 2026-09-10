"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Topbar from "../Topbar";

type AlertStatus = "open" | "investigating" | "resolved";

type Alert = {
  id: number;
  source_ip: string;
  dest_ip: string;
  protocol: string;
  prediction: string;
  risk_score: number;
  risk_level: string;
  status: AlertStatus;
  message: string;
  created_at: string;
};

type Incident = {
  id: number;
  alert_id: number;
  assigned_to: string | null;
  status: "open" | "investigating" | "resolved";
  notes: string | null;
  resolved_at: string | null;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Record<number, Incident>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingIncidentFor, setOpeningIncidentFor] = useState<number | null>(null);

  // ==========================================
  // FETCH ALERTS + INCIDENTS
  // ==========================================

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, incidentsRes] = await Promise.all([
        api.get("/alerts/"),
        api.get("/incidents").catch(() => ({ data: { results: [] } })),
      ]);

      setAlerts(alertsRes.data.results || []);

      const byAlertId: Record<number, Incident> = {};
      for (const inc of incidentsRes.data.results || []) {
        byAlertId[inc.alert_id] = inc;
      }
      setIncidents(byAlertId);

      setError("");
    } catch (err) {
      console.error("Error loading alerts:", err);

      setError(
        "Unable to load alerts. Confirm the backend is running and you are logged in."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // INCIDENT ACTIONS
  // ==========================================

  const openIncident = async (alertId: number) => {
    setOpeningIncidentFor(alertId);
    try {
      const res = await api.post(`/incidents/from-alert/${alertId}`, {});
      setIncidents((prev) => ({ ...prev, [alertId]: res.data }));
      // The backend also moves the alert to "investigating" — reflect that locally
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "investigating" } : a))
      );
    } catch (err) {
      console.error("Error opening incident:", err);
      setError("Unable to open an incident for this alert.");
    } finally {
      setOpeningIncidentFor(null);
    }
  };

  const resolveIncident = async (incident: Incident) => {
    try {
      const res = await api.put(`/incidents/${incident.id}`, { status: "resolved" });
      setIncidents((prev) => ({ ...prev, [incident.alert_id]: res.data }));
      setAlerts((prev) =>
        prev.map((a) => (a.id === incident.alert_id ? { ...a, status: "resolved" } : a))
      );
    } catch (err) {
      console.error("Error resolving incident:", err);
      setError("Unable to resolve this incident.");
    }
  };

  // ==========================================
  // UPDATE ALERT STATUS
  // ==========================================

  const updateStatus = async (
    id: number,
    status: AlertStatus
  ) => {
    try {
      // Backend currently expects status as a query parameter
      await api.put(`/alerts/${id}/status?status=${status}`);

      // Update frontend immediately
      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.id === id
            ? { ...alert, status }
            : alert
        )
      );

      setError("");
    } catch (err) {
      console.error("Error updating alert:", err);

      setError("Unable to update alert status.");
    }
  };

  // ==========================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================

  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ==========================================
  // COUNTS
  // ==========================================

  const criticalCount = alerts.filter(
    (alert) =>
      alert.risk_level === "Critical" &&
      alert.status !== "resolved"
  ).length;

  const highCount = alerts.filter(
    (alert) =>
      alert.risk_level === "High" &&
      alert.status !== "resolved"
  ).length;

  const mediumCount = alerts.filter(
    (alert) =>
      alert.risk_level === "Medium" &&
      alert.status !== "resolved"
  ).length;

  const resolvedCount = alerts.filter(
    (alert) => alert.status === "resolved"
  ).length;

  // ==========================================
  // STYLING
  // ==========================================

  const getSeverityClass = (severity: string) => {
    if (severity === "Critical") {
      return "bg-red-500/20 text-red-400";
    }

    if (severity === "High") {
      return "bg-orange-500/20 text-orange-400";
    }

    if (severity === "Medium") {
      return "bg-yellow-500/20 text-yellow-400";
    }

    return "bg-green-500/20 text-green-400";
  };

  const getStatusClass = (status: AlertStatus) => {
    if (status === "open") {
      return "bg-red-500/20 text-red-400";
    }

    if (status === "investigating") {
      return "bg-yellow-500/20 text-yellow-400";
    }

    return "bg-green-500/20 text-green-400";
  };

  const formatStatus = (status: AlertStatus) => {
    if (status === "open") return "New";
    if (status === "investigating") return "Investigating";
    return "Resolved";
  };

  const formatDate = (date: string) => {
    if (!date) return "—";

    return new Date(date).toLocaleString();
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen">
      <Topbar title="Critical Alerts" />
      <main className="max-w-7xl mx-auto px-6 py-8 text-white">
      {/* HEADER */}

      <div className="mb-8">
        <p className="mb-2 text-sm tracking-[0.25em] text-orange-300">
          ALERT MANAGEMENT
        </p>

        <h1 className="text-3xl font-bold">
          Critical Alerts
        </h1>

        <p className="mt-2 text-gray-400">
          Real-time threat alerts and incident management.
        </p>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-red-500/30 bg-[#222734] p-5">
          <p className="text-sm text-gray-400">
            Critical Alerts
          </p>

          <h2 className="mt-2 text-3xl font-bold text-red-400">
            {criticalCount}
          </h2>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-[#222734] p-5">
          <p className="text-sm text-gray-400">
            High Alerts
          </p>

          <h2 className="mt-2 text-3xl font-bold text-orange-400">
            {highCount}
          </h2>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-[#222734] p-5">
          <p className="text-sm text-gray-400">
            Medium Alerts
          </p>

          <h2 className="mt-2 text-3xl font-bold text-yellow-400">
            {mediumCount}
          </h2>
        </div>

        <div className="rounded-xl border border-green-500/30 bg-[#222734] p-5">
          <p className="text-sm text-gray-400">
            Resolved Incidents
          </p>

          <h2 className="mt-2 text-3xl font-bold text-green-400">
            {resolvedCount}
          </h2>
        </div>
      </div>

      {/* ALERT TABLE */}

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-[#1c2029]">
        <div className="border-b border-gray-700 p-5">
          <h2 className="text-xl font-semibold">
            Active Threat Alerts
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Monitor, investigate, and resolve security incidents.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">
            Loading alerts...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="border-b border-gray-700 bg-[#202530] text-left text-sm text-gray-400">
                <tr>
                  <th className="p-4">Alert ID</th>
                  <th className="p-4">Threat</th>
                  <th className="p-4">Source IP</th>
                  <th className="p-4">Risk Score</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Detected Time</th>
                  <th className="p-4">Incident</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-b border-gray-800 text-sm hover:bg-[#252b36]"
                    >
                      <td className="p-4 font-medium">
                        #{alert.id}
                      </td>

                      <td className="p-4">
                        {alert.message ||
                          alert.prediction ||
                          "Suspicious Activity"}
                      </td>

                      <td className="p-4 text-gray-300">
                        {alert.source_ip}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-md px-3 py-1 font-semibold ${
                            alert.risk_score >= 80
                              ? "bg-red-500/20 text-red-400"
                              : alert.risk_score >= 50
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {alert.risk_score}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-md px-3 py-1 font-semibold ${getSeverityClass(
                            alert.risk_level
                          )}`}
                        >
                          {alert.risk_level}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-md px-3 py-1 font-semibold ${getStatusClass(
                            alert.status
                          )}`}
                        >
                          {formatStatus(alert.status)}
                        </span>
                      </td>

                      <td className="p-4 text-gray-400">
                        {formatDate(alert.created_at)}
                      </td>

                      <td className="p-4">
                        {incidents[alert.id] ? (
                          incidents[alert.id].status === "resolved" ? (
                            <span className="rounded-md px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400">
                              Resolved by {incidents[alert.id].assigned_to || "—"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-md px-3 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                                Owned by {incidents[alert.id].assigned_to || "—"}
                              </span>
                              <button
                                onClick={() => resolveIncident(incidents[alert.id])}
                                className="text-xs text-signal hover:underline"
                              >
                                Resolve
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => openIncident(alert.id)}
                            disabled={openingIncidentFor === alert.id}
                            className="rounded-md border border-violet/40 px-3 py-1.5 text-xs font-semibold text-violet hover:bg-violet/10 transition disabled:opacity-50"
                          >
                            {openingIncidentFor === alert.id ? "Opening..." : "Open Incident"}
                          </button>
                        )}
                      </td>

                      <td className="p-4">
                        <select
                          value={alert.status}
                          onChange={(e) =>
                            updateStatus(
                              alert.id,
                              e.target.value as AlertStatus
                            )
                          }
                          className="rounded-md border border-gray-600 bg-[#2a303c] px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="open">New</option>
                          <option value="investigating">
                            Investigating
                          </option>
                          <option value="resolved">
                            Resolved
                          </option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-gray-400"
                    >
                      No alerts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}