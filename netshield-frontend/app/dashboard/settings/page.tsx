"use client";

import Topbar from "../Topbar";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Settings" />
      <main className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-3">Coming soon</p>
        <h2 className="text-xl font-semibold mb-2">System Configuration</h2>
        <p className="text-muted text-sm max-w-md mx-auto">
          Alert thresholds, notification preferences, and detection engine settings will be
          configurable here.
        </p>
      </main>
    </div>
  );
}
