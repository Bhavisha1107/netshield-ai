"use client";

import { useEffect, useState } from "react";
import Topbar from "../Topbar";
import { api, getToken } from "@/lib/api";

type Threat = {
  id?: number;
  source_ip?: string;
  src_ip?: string;
  dest_ip?: string;
  dst_ip?: string;
  protocol?: string;
  proto?: string;
  service?: string;
  state?: string;
  packet_size?: number;
  duration?: number;
  attack_category?: string;
  attack_cat?: string;
  label?: string;

  prediction?: string;
  confidence?: number;
  model_accuracy?: number;
  risk_score?: number;
  severity?: string;

  timestamp?: string;

  report?: {
    status?: string;
    recommendation?: string;
  };
};

export default function ThreatsPage() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

useEffect(() => {
  fetchThreats(true);

  const interval = setInterval(() => {
    fetchThreats(false);
  }, 2000);

  return () => clearInterval(interval);
}, []);

  const fetchThreats = async (showLoading = false) => {
    try {
      if (showLoading) {
  setLoading(true);
}
      setError("");

      const token = getToken();

      if (!token) {
        setError("Authentication token not found. Please login again.");
        return;
      }

      console.log("JWT token found");

      const response = await api.get("/traffic/recent", {
        params: {
          limit: 10,
        },
      });

      console.log(
        "THREAT API RESPONSE:",
        JSON.stringify(response.data, null, 2)
      );

      const data = response.data;

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : [];

      if (records.length > 0) {
        setThreats(
          records.map((record) => ({
            ...record,
            source_ip: record.source_ip ?? record.src_ip,
            dest_ip: record.dest_ip ?? record.dst_ip,
            protocol: record.protocol ?? record.proto,
            attack_category: record.attack_category ?? record.attack_cat,
          }))
        );
      } else {
        setThreats([]);
      }
    } catch (err: any) {
      console.error("Threat API error:", err);

      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Data:", err.response.data);

        setError(
          err.response.data?.detail ||
            `API request failed (${err.response.status})`
        );
      } else {
        setError("Could not connect to the backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Threats" />

      <main className="p-6">
        <div className="mb-6">
          <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">
            AI THREAT DETECTION
          </p>

          <h2 className="text-2xl font-semibold mb-2">
            Intrusion Prediction & Threat Classification
          </h2>

          <p className="text-muted text-sm">
            AI-scored network threats detected by NetShield AI.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>

  <span className="text-green-400 text-sm font-mono">
    LIVE MONITORING
  </span>

  <span className="text-muted text-xs">
    • Updating every 2 seconds
  </span>
</div>

        {loading && (
          <div className="text-muted">
            Loading threats...
          </div>
        )}

        {!loading && error && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-400">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && threats.length === 0 && (
          <div className="border border-white/10 rounded-lg p-8 text-center">
            <p className="text-lg font-semibold">
              No threats found
            </p>

            <p className="text-muted text-sm mt-2">
              The backend returned no recent threat records.
            </p>
          </div>
        )}

        {!loading && !error && threats.length > 0 && (
          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted">
                  <th className="text-left p-4">Time</th>
                  <th className="text-left p-4">Source IP</th>
                  <th className="text-left p-4">Destination IP</th>
                  <th className="text-left p-4">Protocol</th>
                  <th className="text-left p-4">Attack Category</th>
                  <th className="text-left p-4">Prediction</th>
                  <th className="text-left p-4">Confidence</th>
                  <th className="text-left p-4">Risk Score</th>
                  <th className="text-left p-4">Severity</th>
                </tr>
              </thead>

              <tbody>
                {threats.map((threat, index) => (
                  <tr
                    key={`${threat.timestamp}-${index}`}
                    className="border-b border-white/5"
                  >
                    <td className="p-4 whitespace-nowrap">
                      {threat.timestamp
                        ? new Date(threat.timestamp).toLocaleString()
                        : "-"}
                    </td>

         <td className="p-4">
  {threat.source_ip ?? "-"}
</td>

<td className="p-4">
  {threat.dest_ip ?? "-"}
</td>

                    <td className="p-4">
                      {threat.protocol ?? "-"}
                    </td>

                    <td className="p-4">
                      {threat.attack_category ?? "-"}
                    </td>

                    <td className="p-4">
                      {threat.prediction ?? "-"}
                    </td>
                    

                    <td className="p-4">
                      {threat.confidence != null
                        ? `${threat.confidence}%`
                        : "-"}
                    </td>

  <td className="p-4">
  {threat.risk_score != null ? (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        threat.risk_score >= 81
          ? "bg-red-500/20 text-red-400"
          : threat.risk_score >= 61
          ? "bg-orange-500/20 text-orange-400"
          : threat.risk_score >= 31
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-green-500/20 text-green-400"
      }`}
    >
      {threat.risk_score}
    </span>
  ) : (
    "-"
  )}
</td>

                    <td className="p-4">
  {threat.severity ? (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        threat.severity.toLowerCase() === "critical"
          ? "bg-red-500/20 text-red-400"
          : threat.severity.toLowerCase() === "high"
          ? "bg-orange-500/20 text-orange-400"
          : threat.severity.toLowerCase() === "medium"
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-green-500/20 text-green-400"
      }`}
    >
      {threat.severity}
    </span>
  ) : (
    "-"
  )}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}