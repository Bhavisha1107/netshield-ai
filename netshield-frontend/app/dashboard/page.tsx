"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { api } from "@/lib/api";
import Topbar from "./Topbar";

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

type TrafficRecord = {
  timestamp: string;
  src_ip?: string;
  source_ip?: string;
  dst_ip?: string;
  dest_ip?: string;
  protocol: string;
  service: string;
  state: string;
  packet_size?: number;
  duration: number;
  attack_category: string;
  label: "BENIGN" | "ATTACK";

  // AI results
  prediction?: string;
  confidence?: number;
  model_accuracy?: number;
  risk_score?: number;
  severity: "Critical" | "High" | "Medium" | "Low";
};

type Stats = {
  total_packets: number;
  normal_packets: number;
  attack_packets: number;
  normal_percent: number;
  attack_percent: number;
  average_risk_score: number;
  maximum_risk_score: number;

  severity: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };

  by_protocol: {
    protocol: string;
    count: number;
  }[];
};

type Prediction = {
  prediction: string;
  confidence: number;
  model_accuracy: number;
  risk_score: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  report?: {
    status: string;
    recommendation: string;
  };
};

type SortKey =
  | "src_ip"
  | "protocol"
  | "packet_size"
  | "label";

type SortDir = "asc" | "desc";

export default function DashboardPage() {
  const [records, setRecords] = useState<TrafficRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [chartTab, setChartTab] =
    useState<"protocols" | "ratio">("protocols");

  const [search, setSearch] = useState("");

  const [filterLabel, setFilterLabel] =
    useState<"ALL" | "BENIGN" | "ATTACK">("ALL");

  const [sortKey, setSortKey] =
    useState<SortKey>("packet_size");

  const [sortDir, setSortDir] =
    useState<SortDir>("desc");

  const [expandedRow, setExpandedRow] =
    useState<string | null>(null);

  const [prediction, setPrediction] =
    useState<Prediction | null>(null);

  // --------------------------------------------------
  // FETCH TRAFFIC DATA
  // --------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const [recentRes, statsRes] = await Promise.all([
        api.get("/traffic/recent?limit=60"),
        api.get("/traffic/stats"),
      ]);

      setRecords(recentRes.data.results);
      if (recentRes.data.results.length > 0) {
  const latest = recentRes.data.results[0];

  setPrediction({
    prediction: latest.prediction || "Unknown",
    confidence: latest.confidence || 0,
    model_accuracy: latest.model_accuracy || 0,
    risk_score: latest.risk_score || 0,
    severity: latest.severity || "Low",
  });
}
      setStats(statsRes.data);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to reach NetShield API. Confirm the backend is running."
      );
    }
  }, []);

  // --------------------------------------------------
  // AI PREDICTION
  // --------------------------------------------------

  const runPrediction = async () => {
    try {
      const latestTraffic = records[0];

      const response = await api.post(
        "/prediction/predict",
        {
          // NOTE: 42 values — matches the retrained model's feature count
          // (the leaky "id" column was removed from training, see app/ai/preprocess.py)
          features: [
            2,
            0,
            1,
            45,
            32,
            400,
            500,
            20,
            64,
            64,
            10,
            20,
            0,
            0,
            5,
            4,
            1,
            2,
            255,
            0,
            0,
            255,
            0.1,
            0.05,
            0.05,
            100,
            120,
            0,
            0,
            3,
            2,
            5,
            6,
            2,
            4,
            0,
            0,
            1,
            3,
            5,
            0,
            10,
          ],
          source_ip:
            latestTraffic?.src_ip || latestTraffic?.source_ip || "10.0.0.1",
          dest_ip:
            latestTraffic?.dst_ip || latestTraffic?.dest_ip || "192.168.0.1",
          protocol: latestTraffic?.protocol || "TCP",
        }
      );

      console.log("Prediction response:", response.data);

      setPrediction(response.data);
    } catch (err: any) {
      console.error("Prediction error:", err);

      setError(
        err.response?.data?.detail ||
          `Unable to get AI prediction (${err.response?.status || "network error"}).`
      );
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

useEffect(() => {
  fetchData();

  const interval = setInterval(() => {
    fetchData();
  }, 8000);

  return () => clearInterval(interval);
}, [fetchData]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const normalCount = stats
  ? stats.normal_packets
  : 0;

  const topProtocols = stats
    ? [...stats.by_protocol]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  // --------------------------------------------------
  // SORT
  // --------------------------------------------------

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) =>
        d === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // --------------------------------------------------
  // FILTER + SEARCH
  // --------------------------------------------------

  const filteredRecords = useMemo(() => {
    let out = records;

    if (filterLabel !== "ALL") {
      out = out.filter(
        (r) => r.label === filterLabel
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      out = out.filter(
        (r) =>
          r.src_ip.toLowerCase().includes(q) ||
          r.dst_ip.toLowerCase().includes(q) ||
          r.protocol.toLowerCase().includes(q) ||
          r.attack_category.toLowerCase().includes(q)
      );
    }

const sorted = [...out].sort((a, b) => {
  let av = a[sortKey] ?? "";
  let bv = b[sortKey] ?? "";

  if (typeof av === "string") {
    av = av.toLowerCase();
  }

  if (typeof bv === "string") {
    bv = bv.toLowerCase();
  }

  if (av < bv) {
    return sortDir === "asc" ? -1 : 1;
  }

  if (av > bv) {
    return sortDir === "asc" ? 1 : -1;
  }

  return 0;
});

    return sorted;
  }, [
    records,
    search,
    filterLabel,
    sortKey,
    sortDir,
  ]);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen">
      <Topbar title="Live Monitoring" />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-md px-4 py-3 mb-6 font-mono">
            {error}
          </div>
        )}

        {/* =====================================================
            AI THREAT PREDICTION
        ===================================================== */}

{/* =====================================================
    AI THREAT PREDICTION
===================================================== */}

{prediction && (
  <div className="bg-panel border border-line rounded-xl p-5 mb-4">

    {/* HEADER */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-mono text-xs tracking-widest text-muted uppercase">
          AI Threat Detection
        </h2>

        <p className="text-xs text-muted mt-1">
          Latest machine learning prediction
        </p>
      </div>

      <span
        className={`px-3 py-1 rounded-full text-xs font-mono ${
          prediction.prediction === "Attack"
            ? "bg-alert/10 text-alert"
            : "bg-signal/10 text-signal"
        }`}
      >
        {prediction.prediction}
      </span>
    </div>

    {/* AI RESULT CARDS */}
    <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">

      {/* PREDICTION */}
      <div className="bg-panel2 rounded-lg p-4">
        <p className="text-xs text-muted">
          Prediction
        </p>

        <p
          className={`text-lg font-bold mt-1 ${
            prediction.prediction === "Attack"
              ? "text-alert"
              : "text-signal"
          }`}
        >
          {prediction.prediction}
        </p>
      </div>

      {/* CONFIDENCE */}
      <div className="bg-panel2 rounded-lg p-4">
        <p className="text-xs text-muted">
          Confidence
        </p>

        <p className="text-lg font-bold mt-1">
          {prediction.confidence}%
        </p>
      </div>

      {/* MODEL ACCURACY */}
      <div className="bg-panel2 rounded-lg p-4">
        <p className="text-xs text-muted">
          Model Accuracy
        </p>

        <p className="text-lg font-bold text-green-400 mt-1">
          {prediction.model_accuracy}%
        </p>
      </div>

      {/* RISK SCORE */}
      <div className="bg-panel2 rounded-lg p-4">
        <p className="text-xs text-muted">
          Risk Score
        </p>

        <p className="text-lg font-bold text-red-400 mt-1">
          {prediction.risk_score}/100
        </p>
      </div>

      {/* SEVERITY */}
      <div className="bg-panel2 rounded-lg p-4">
        <p className="text-xs text-muted">
          Severity
        </p>

        <p
          className={`text-lg font-bold mt-1 ${
            prediction.severity === "Critical"
              ? "text-red-500"
              : prediction.severity === "High"
              ? "text-orange-400"
              : prediction.severity === "Medium"
              ? "text-yellow-400"
              : "text-green-500"
          }`}
        >
          {prediction.severity}
        </p>
      </div>

    </div>

    {/* AI REPORT */}
    {prediction.report && (
      <div className="mt-4 border border-line rounded-lg p-4">

        <p className="text-xs text-muted uppercase tracking-wider">
          AI Report
        </p>

        <p className="text-sm text-text mt-2">
          {prediction.report.status}
        </p>

        <p className="text-xs text-muted mt-2">
          Recommendation:{" "}
          {prediction.report.recommendation}
        </p>

      </div>
    )}

    {/* RUN AI PREDICTION BUTTON */}
    <div className="mt-5 flex justify-end">
      <button
        onClick={runPrediction}
        className="bg-violet text-white px-4 py-2 rounded-lg text-sm font-mono hover:opacity-90 transition"
      >
        Run AI Prediction
      </button>
    </div>

  </div>
)}

        {/* =====================================================
            DASHBOARD STATISTICS
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

          <BentoStat
  className="lg:col-span-3"
  label="Total Traffic"
  value={
    stats
      ? stats.total_packets.toLocaleString()
      : "—"
  }
  accent="text-text"
  big
/>

<BentoStat
  className="lg:col-span-3"
  label="Normal Traffic"
  value={
    stats
      ? stats.normal_packets.toLocaleString()
      : "—"
  }
  sub={
    stats
      ? `${stats.normal_percent}% of traffic`
      : ""
  }
  accent="text-signal"
/>

<BentoStat
  className="lg:col-span-3"
  label="Detected Attacks"
  value={
    stats
      ? stats.attack_packets.toLocaleString()
      : "—"
  }
  sub={
    stats
      ? `${stats.attack_percent}% of traffic`
      : ""
  }
  accent="text-alert"
/>

<BentoStat
  className="lg:col-span-3"
  label="Average Risk"
  value={
    stats
      ? `${stats.average_risk_score}`
      : "—"
  }
  sub="Risk score / 100"
  accent="text-orange-400"
/>

        </div>

        {/* =====================================================
            CHARTS
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

          <div className="lg:col-span-8 bg-panel border border-line rounded-xl p-5">

            <div className="flex items-center justify-between mb-4">

              <div className="flex gap-1 bg-panel2 rounded-lg p-1">

                <TabButton
                  active={chartTab === "protocols"}
                  onClick={() =>
                    setChartTab("protocols")
                  }
                >
                  Protocols
                </TabButton>

                <TabButton
                  active={chartTab === "ratio"}
                  onClick={() =>
                    setChartTab("ratio")
                  }
                >
                  Threat Ratio
                </TabButton>

              </div>

            </div>

            {chartTab === "protocols" ? (

              topProtocols.length > 0 ? (

                <Bar
                  data={{
                    labels: topProtocols.map(
                      (p) => p.protocol
                    ),

                    datasets: [
                      {
                        data: topProtocols.map(
                          (p) => p.count
                        ),
                        backgroundColor:
                          "#8B7CF6",
                        borderRadius: 4,
                        maxBarThickness: 32,
                      },
                    ],
                  }}

                  options={{
                    responsive: true,

                    plugins: {
                      legend: {
                        display: false,
                      },
                    },

                    scales: {
                      x: {
                        ticks: {
                          color: "#8A8F9C",
                        },
                        grid: {
                          display: false,
                        },
                      },

                      y: {
                        ticks: {
                          color: "#8A8F9C",
                        },
                        grid: {
                          color: "#2E323D",
                        },
                      },
                    },
                  }}
                />

              ) : (

                <p className="text-muted text-sm">
                  Waiting for traffic data...
                </p>

              )

            ) : stats ? (

              <div className="max-w-xs mx-auto">

                <Doughnut
                  data={{
                    labels: [
  "Normal",
  "Attack",
],

                    datasets: [
                      {
                        data: [
  stats.normal_packets,
  stats.attack_packets,
],

                        backgroundColor: [
                          "#34D399",
                          "#F5A855",
                        ],

                        borderColor: "#1C1F27",
                        borderWidth: 3,
                      },
                    ],
                  }}

                  options={{
                    plugins: {
                      legend: {
                        position: "bottom",

                        labels: {
                          color: "#E7E9EE",

                          font: {
                            family:
                              "JetBrains Mono",
                            size: 11,
                          },
                        },
                      },
                    },
                  }}
                />

              </div>

            ) : (

              <p className="text-muted text-sm">
                Waiting for traffic data...
              </p>

            )}

          </div>

          {/* DETECTION SNAPSHOT */}

          <div className="lg:col-span-4 bg-panel border border-line rounded-xl p-5 flex flex-col justify-center">

            <h2 className="font-mono text-xs tracking-widest text-muted uppercase mb-4">
              Detection Snapshot
            </h2>

            <div className="space-y-3">

              <SnapshotRow
                label="Distinct protocols"
                value={
                  stats
                    ? stats.by_protocol.length.toString()
                    : "—"
                }
              />

              <SnapshotRow
                label="Top protocol"
                value={
                  topProtocols[0]?.protocol || "—"
                }
                accent="text-violet"
              />

              <SnapshotRow
  label="Attack rate"
  value={
    stats
      ? `${stats.attack_percent}%`
      : "—"
  }
  accent="text-alert"
/>

<SnapshotRow
  label="Average risk"
  value={
    stats
      ? `${stats.average_risk_score}/100`
      : "—"
  }
  accent="text-orange-400"
/>

<SnapshotRow
  label="Maximum risk"
  value={
    stats
      ? `${stats.maximum_risk_score}/100`
      : "—"
  }
  accent="text-red-400"
/>

<SnapshotRow
  label="Critical threats"
  value={
    stats
      ? stats.severity.Critical.toString()
      : "—"
  }
  accent="text-red-500"
/>

              <SnapshotRow
                label="Last sync"
                value={
                  lastUpdated
                    ? lastUpdated.toLocaleTimeString()
                    : "—"
                }
              />

            </div>

          </div>

        </div>

        {/* =====================================================
            RECENT TRAFFIC
        ===================================================== */}

        <div className="bg-panel border border-line rounded-xl overflow-hidden">

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-line">

            <h2 className="font-mono text-xs tracking-widest text-muted uppercase shrink-0">
              Recent Traffic
            </h2>

            <div className="flex-1 flex items-center gap-2 sm:ml-4">

              <input
                type="text"
                placeholder="Search IP, protocol, category..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="flex-1 bg-panel2 border border-line rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet/50 focus:border-violet/50"
              />

              <div className="flex gap-1 bg-panel2 rounded-md p-1">

                {(
                  [
                    "ALL",
                    "BENIGN",
                    "ATTACK",
                  ] as const
                ).map((l) => (

                  <button
                    key={l}
                    onClick={() =>
                      setFilterLabel(l)
                    }
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      filterLabel === l
                        ? l === "ATTACK"
                          ? "bg-alert/20 text-alert"
                          : l === "BENIGN"
                          ? "bg-signal/20 text-signal"
                          : "bg-panel text-text"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {l}
                  </button>

                ))}

              </div>

            </div>

            <span className="text-xs text-muted font-mono shrink-0">
              {filteredRecords.length} of{" "}
              {records.length}
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm font-mono">

              <thead>

                <tr className="text-muted text-xs uppercase border-b border-line">

                  <SortableHeader
                    label="Source"
                    sortKey="src_ip"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />

                  <th className="text-left px-5 py-2.5 font-medium">
                    Destination
                  </th>

                  <SortableHeader
                    label="Protocol"
                    sortKey="protocol"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />

                  <th className="text-left px-5 py-2.5 font-medium">
                    State
                  </th>

                  <SortableHeader
                    label="Size"
                    sortKey="packet_size"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />

                  <th className="text-left px-5 py-2.5 font-medium">
                    Category
                  </th>

                  <SortableHeader
                    label="Status"
                    sortKey="label"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />

                </tr>

              </thead>

              <tbody>

                {filteredRecords
                  .slice(0, 25)
                  .map((r, i) => (

                    <Fragment key={`${r.timestamp}-${r.src_ip}-${i}`}>

                      <tr
                onClick={() => {
  const rowId = `${r.timestamp}-${r.src_ip}-${i}`;

  setExpandedRow(
    expandedRow === rowId ? null : rowId
  );
}}
                        className="border-b border-line/50 hover:bg-panel2 transition-colors cursor-pointer"
                      >

                        <td className="px-5 py-2.5 text-text">
                          {r.src_ip}
                        </td>

                        <td className="px-5 py-2.5 text-muted">
                          {r.dst_ip}
                        </td>

                        <td className="px-5 py-2.5">
                          {r.protocol}
                        </td>

                        <td className="px-5 py-2.5 text-muted">
                          {r.state}
                        </td>

                        <td className="px-5 py-2.5 text-muted">
  {typeof r.packet_size === "number"
    ? `${r.packet_size.toLocaleString()}B`
    : "—"}
</td>

                        <td className="px-5 py-2.5 text-muted">
                          {r.attack_category}
                        </td>

                        <td className="px-5 py-2.5">

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                              r.label === "ATTACK"
                                ? "bg-alert/10 text-alert"
                                : "bg-signal/10 text-signal"
                            }`}
                          >

                            <span
                              className={`status-dot ${
                                r.label === "ATTACK"
                                  ? "bg-alert"
                                  : "bg-signal"
                              }`}
                            />

                            {r.label}

                          </span>

                        </td>

                      </tr>

                      {expandedRow ===
  `${r.timestamp}-${r.src_ip}-${i}` && (

                        <tr className="bg-panel2/60 border-b border-line/50">

                          <td
                            colSpan={7}
                            className="px-5 py-3"
                          >

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">

                              <DetailField
                                label="Timestamp"
                                value={new Date(
                                  r.timestamp
                                ).toLocaleString()}
                              />

                              <DetailField
                                label="Service"
                                value={r.service}
                              />

                              <DetailField
                                label="Full source"
                                value={r.src_ip}
                              />

                              <DetailField
                                label="Full destination"
                                value={r.dst_ip}
                              />

                            </div>

                          </td>

                        </tr>

                      )}

                    </Fragment>

                  ))}

                {filteredRecords.length === 0 && (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-muted"
                    >
                      {records.length === 0
                        ? "No traffic records yet. Run the ingestion script to load data."
                        : "No records match your search/filter."}
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </main>

    </div>
  );
}

// =====================================================
// BENTO STAT
// =====================================================

function BentoStat({
  label,
  value,
  sub,
  accent,
  className = "",
  big = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  className?: string;
  big?: boolean;
}) {
  return (
    <div
      className={`bg-panel border border-line rounded-xl p-5 ${className}`}
    >

      <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">
        {label}
      </p>

      <p
        className={`${
          big ? "text-4xl" : "text-3xl"
        } font-semibold font-mono ${accent}`}
      >
        {value}
      </p>

      {sub && (
        <p className="text-xs text-muted mt-1">
          {sub}
        </p>
      )}

    </div>
  );
}

// =====================================================
// TAB BUTTON
// =====================================================

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
        active
          ? "bg-violet/20 text-violet"
          : "text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

// =====================================================
// SNAPSHOT ROW
// =====================================================

function SnapshotRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-xs text-muted">
        {label}
      </span>

      <span
        className={`text-sm font-mono ${
          accent || "text-text"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

// =====================================================
// SORTABLE HEADER
// =====================================================

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const active = current === sortKey;

  return (
    <th
      onClick={() => onClick(sortKey)}
      className="text-left px-5 py-2.5 font-medium cursor-pointer select-none hover:text-text transition-colors"
    >

      <span className="inline-flex items-center gap-1">

        {label}

        {active && (
          <span className="text-violet">
            {dir === "asc" ? "↑" : "↓"}
          </span>
        )}

      </span>

    </th>
  );
}

// =====================================================
// DETAIL FIELD
// =====================================================

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-muted uppercase tracking-wide mb-0.5">
        {label}
      </p>

      <p className="text-text">
        {value}
      </p>

    </div>
  );
}