"use client";

import { useAuth } from "@/lib/auth-context";

export default function Topbar({ title }: { title: string }) {
  const { logout } = useAuth();

  return (
    <header className="border-b border-line bg-panel/60 backdrop-blur sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="font-mono text-sm tracking-widest text-muted uppercase">{title}</h1>
        <button
          onClick={logout}
          className="text-muted hover:text-critical transition-colors text-xs font-mono border border-line rounded px-3 py-1.5"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
