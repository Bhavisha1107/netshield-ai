"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"analyst" | "admin">("analyst");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await api.post("/auth/signup", { name, email, password, role });
      }
      const res = await api.post("/auth/login", { email, password });
      saveToken(res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-base">
      {/* Two soft gradient blobs establish the violet/cyan identity right from the first screen */}
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-violet/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-cyan/15 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 scanlines pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="status-dot bg-cyan animate-pulse" />
          <span className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            System Monitoring Active
          </span>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-11 h-11 rounded-xl accent-gradient flex items-center justify-center shadow-lg shadow-violet/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14161C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" />
            </svg>
          </div>
        </div>

        <h1 className="font-mono text-2xl font-semibold text-center mb-1 tracking-tight">
          NetShield <span className="accent-gradient-text">AI</span>
        </h1>
        <p className="text-center text-muted text-sm mb-8">
          Network Anomaly Detection &amp; Threat Monitoring
        </p>

        <div className="bg-panel/90 backdrop-blur border border-line rounded-xl p-6 shadow-2xl shadow-black/20">
          <div className="flex mb-6 border border-line rounded-md overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 transition-colors ${
                mode === "login" ? "bg-panel2 text-text" : "text-muted hover:text-text"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 transition-colors ${
                mode === "signup" ? "bg-panel2 text-text" : "text-muted hover:text-text"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-muted mb-1.5 font-mono">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet/60"
                  placeholder="Analyst name"
                />
              </div>
            )}
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-muted mb-1.5 font-mono">ROLE</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("analyst")}
                    className={`py-2 rounded-md border text-sm font-medium transition-colors ${
                      role === "analyst"
                        ? "border-cyan bg-cyan/10 text-cyan"
                        : "border-line text-muted hover:text-text"
                    }`}
                  >
                    Security Analyst
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-2 rounded-md border text-sm font-medium transition-colors ${
                      role === "admin"
                        ? "border-violet bg-violet/10 text-violet"
                        : "border-line text-muted hover:text-text"
                    }`}
                  >
                    Administrator
                  </button>
                </div>
                <p className="text-muted text-xs mt-1.5">
                  {role === "admin"
                    ? "Full access: manage users, view audit logs, configure system."
                    : "Monitor traffic, review threats, respond to alerts."}
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs text-muted mb-1.5 font-mono">EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet/60"
                placeholder="you@organization.com"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5 font-mono">PASSWORD</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet/60"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-critical text-xs font-mono bg-critical/10 border border-critical/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full accent-gradient text-base font-semibold text-sm py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ color: "#14161C" }}
            >
              {loading ? "Connecting..." : mode === "login" ? "Sign in" : "Create account & sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6 font-mono">
          First account created becomes <span className="text-violet">admin</span> automatically
        </p>
      </div>
    </div>
  );
}
