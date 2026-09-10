"use client";

import { useEffect, useState } from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { api } from "@/lib/api";
import Topbar from "../Topbar";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const doughnutOptions: ChartOptions<"doughnut"> = {
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#E7E9EE",
      },
    },
  },
};

const pieOptions: ChartOptions<"pie"> = {
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#E7E9EE",
        font: {
          family: "JetBrains Mono",
          size: 11,
        },
      },
    },
  },
};

const barOptions: ChartOptions<"bar"> = {
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
      beginAtZero: true,
      ticks: {
        color: "#8A8F9C",
        precision: 0,
      },
      grid: {
        color: "#2E323D",
      },
    },
  },
};

type SeverityItem = {
  severity: string;
  count: number;
};

type TopIP = {
  source_ip: string | null;
  count: number;
};

type StatusItem = {
  status: string;
  count: number;
};

type RiskScoreItem = {
  range: string;
  count: number;
};

type AttackItem = {
  category: string;
  count: number;
};

type ProtocolItem = {
  protocol: string;
  count: number;
};

type ReportData = {
  report_title: string;

  summary: {
    total_alerts: number;
    critical_alerts: number;
    high_alerts: number;
    resolved_alerts: number;
  };

  risk_analysis: {
    average_risk_score: number;
    maximum_risk_score: number;
  };

  severity_distribution: SeverityItem[];

  top_attacking_ips: TopIP[];

  status_distribution: StatusItem[];

  risk_score_distribution: RiskScoreItem[];

  attack_distribution: AttackItem[];

  protocol_distribution: ProtocolItem[];

  recommendation: string;
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);

      const [reportRes, metricsRes] = await Promise.all([
        api.get("/reports/threat-intelligence"),
        api.get("/prediction/metrics").catch(() => ({ data: { available: false } })),
      ]);

      setReport(reportRes.data);
      setModelMetrics(metricsRes.data);
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load the Threat Intelligence Report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Topbar title="Threat Intelligence" />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-muted">
            Loading threat intelligence report...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Threat Intelligence" />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

          <div>
            <h1 className="text-2xl font-bold">
              Threat Intelligence Report
            </h1>

            <p className="text-sm text-muted mt-1">
              Security analytics, threat analysis and incident intelligence.
            </p>
          </div>

          <button
            onClick={fetchReport}
            className="bg-violet text-white px-4 py-2 rounded-lg text-sm font-mono hover:opacity-90 transition"
          >
            Refresh Report
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {report && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

              <StatCard
                label="Total Threats"
                value={report.summary.total_alerts}
                accent="text-text"
              />

              <StatCard
                label="Critical Threats"
                value={report.summary.critical_alerts}
                accent="text-red-500"
              />

              <StatCard
                label="High-Risk Threats"
                value={report.summary.high_alerts}
                accent="text-orange-400"
              />

              <StatCard
                label="Resolved Incidents"
                value={report.summary.resolved_alerts}
                accent="text-signal"
              />

            </div>

            {/* AI MODEL PERFORMANCE */}
            {modelMetrics?.available && (
              <div className="bg-panel border border-line rounded-lg p-5 mb-4">
                <h2 className="font-mono text-xs tracking-widest text-muted uppercase mb-4">
                  AI Model Performance (Random Forest — live from last retrain)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MetricPill label="Accuracy" value={modelMetrics.accuracy} />
                  <MetricPill label="Precision" value={modelMetrics.precision} />
                  <MetricPill label="Recall" value={modelMetrics.recall} />
                  <MetricPill label="F1 Score" value={modelMetrics.f1_score} />
                </div>
                {modelMetrics.test_set_size && (
                  <p className="text-xs text-muted mt-3 font-mono">
                    Evaluated on {modelMetrics.test_set_size.toLocaleString()} held-out test records
                  </p>
                )}
              </div>
            )}

            {/* RISK ANALYSIS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

              <div className="bg-panel border border-line rounded-xl p-5">

                <p className="text-xs font-mono uppercase tracking-widest text-muted">
                  Average Risk Score
                </p>

                <p className="text-4xl font-bold mt-3 text-orange-400">
                  {report.risk_analysis.average_risk_score}
                </p>

                <p className="text-xs text-muted mt-2">
                  Average threat risk / 100
                </p>

              </div>

              <div className="bg-panel border border-line rounded-xl p-5">

                <p className="text-xs font-mono uppercase tracking-widest text-muted">
                  Maximum Risk Score
                </p>

                <p className="text-4xl font-bold mt-3 text-red-400">
                  {report.risk_analysis.maximum_risk_score}
                </p>

                <p className="text-xs text-muted mt-2">
                  Highest detected threat / 100
                </p>

              </div>

              <div className="bg-panel border border-line rounded-xl p-5">

                <p className="text-xs font-mono uppercase tracking-widest text-muted">
                  Security Status
                </p>

                <p className="text-lg font-bold mt-3 text-alert">
                  Attention Required
                </p>

                <p className="text-xs text-muted mt-2">
                  Review active high-risk security alerts.
                </p>

              </div>

            </div>

            {/* 6 ATTACK VISUALIZATION DASHBOARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartPanel title="1. Severity Distribution">
                <div className="max-w-sm mx-auto">
                  <Doughnut
                    data={{
                      labels: report.severity_distribution.map((item) => item.severity),
                      datasets: [{
                        data: report.severity_distribution.map((item) => item.count),
                        backgroundColor: ["#EF4444", "#F97316", "#FACC15", "#34D399"],
                        borderColor: "#1C1F27",
                        borderWidth: 3,
                      }],
                    }}
                    options={doughnutOptions}
                  />
                </div>
              </ChartPanel>

              <ChartPanel title="2. Top Attacking IPs">
                {report.top_attacking_ips.length > 0 ? (
                  <Bar
                    data={{
                      labels: report.top_attacking_ips.map((item) => item.source_ip || "Unknown"),
                      datasets: [{
                        label: "Threat Count",
                        data: report.top_attacking_ips.map((item) => item.count),
                        backgroundColor: "#8B7CF6",
                        borderRadius: 5,
                      }],
                    }}
                    options={barOptions}
                  />
                ) : (
                  <p className="text-sm text-muted">No attacking IP data available.</p>
                )}
              </ChartPanel>

              <ChartPanel
                title="3. Alert Status Distribution"
                description="Current incident response workflow status."
              >
                <div className="max-w-sm mx-auto">
                  <Pie
                    data={{
                      labels: report.status_distribution.map((item) => item.status),
                      datasets: [{
                        data: report.status_distribution.map((item) => item.count),
                        backgroundColor: ["#EF4444", "#FACC15", "#34D399"],
                        borderColor: "#1C1F27",
                        borderWidth: 3,
                      }],
                    }}
                    options={pieOptions}
                  />
                </div>
              </ChartPanel>

              <ChartPanel
                title="4. Risk Score Distribution"
                description="Distribution of detected threats by risk score."
              >
                <Bar
                  data={{
                    labels: report.risk_score_distribution.map((item) => item.range),
                    datasets: [{
                      label: "Number of Threats",
                      data: report.risk_score_distribution.map((item) => item.count),
                      backgroundColor: "#F97316",
                      borderRadius: 5,
                      maxBarThickness: 50,
                    }],
                  }}
                  options={barOptions}
                />
              </ChartPanel>

              <ChartPanel title="5. Attack Prediction Distribution">
                <Bar
                  data={{
                    labels: report.attack_distribution.map((item) => item.category),
                    datasets: [{
                      label: "Detected Alerts",
                      data: report.attack_distribution.map((item) => item.count),
                      backgroundColor: "#EF4444",
                      borderRadius: 5,
                    }],
                  }}
                  options={barOptions}
                />
              </ChartPanel>

              <ChartPanel title="6. Protocol-wise Attack Analysis">
                <Doughnut
                  data={{
                    labels: report.protocol_distribution.map((item) => item.protocol),
                    datasets: [{
                      data: report.protocol_distribution.map((item) => item.count),
                      backgroundColor: ["#8B7CF6", "#34D399", "#F97316", "#FACC15", "#EF4444"],
                      borderColor: "#1C1F27",
                      borderWidth: 3,
                    }],
                  }}
                  options={doughnutOptions}
                />
              </ChartPanel>
            </div>

            {/* TOP ATTACKING IP TABLE */}
            <div className="bg-panel border border-line rounded-xl p-5 mb-4">

              <h2 className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
                Threat Source Analysis
              </h2>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-line text-muted text-left">

                      <th className="pb-3">
                        Source IP
                      </th>

                      <th className="pb-3">
                        Detected Threats
                      </th>

                      <th className="pb-3">
                        Assessment
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {report.top_attacking_ips.map(
                      (item, index) => (

                        <tr
                          key={index}
                          className="border-b border-line/50"
                        >

                          <td className="py-3 font-mono">
                            {item.source_ip || "Unknown"}
                          </td>

                          <td className="py-3">
                            {item.count}
                          </td>

                          <td className="py-3">

                            <span className="text-alert">
                              Suspicious Activity
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

            {/* SECURITY RECOMMENDATION */}
            <div className="bg-panel border border-violet/30 rounded-xl p-5">

              <p className="font-mono text-xs uppercase tracking-widest text-violet">
                AI Security Recommendation
              </p>

              <p className="text-sm text-text mt-3 leading-6">
                {report.recommendation}
              </p>

            </div>
          </>
        )}

      </main>
    </div>
  );
}


// =====================================================
// STAT CARD
// =====================================================

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel2 border border-line rounded-lg px-4 py-3 text-center">
      <p className="text-2xl font-mono font-semibold text-cyan">{value}%</p>
      <p className="text-xs text-muted uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-panel border border-line rounded-xl p-5">

      <p className="text-xs text-muted font-mono uppercase tracking-widest">
        {label}
      </p>

      <p
        className={`text-3xl font-bold mt-3 ${accent}`}
      >
        {value}
      </p>

    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-panel border border-line rounded-xl p-5">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted mb-5">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-muted -mt-3 mb-5">{description}</p>
      )}
      {children}
    </div>
  );
}