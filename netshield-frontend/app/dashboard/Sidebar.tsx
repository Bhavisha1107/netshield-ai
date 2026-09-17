"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  roles: Array<"admin" | "analyst">;
  icon: JSX.Element;
};

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["admin", "analyst"], icon: <Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /> },
  { label: "Threats", href: "/dashboard/threats", roles: ["admin", "analyst"], icon: <Icon d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" /> },
  { label: "Critical Alerts", href: "/dashboard/alerts", roles: ["admin", "analyst"], icon: <Icon d="M12 3v10m0 4v.01M4 20h16L12 4 4 20Z" /> },
  { label: "Notifications", href: "/dashboard/notifications", roles: ["admin", "analyst"], icon: <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /> },
  { label: "Threat Intelligence", href: "/dashboard/reports", roles: ["admin", "analyst"], icon: <Icon d="M3 3v18h18M7 14l4-4 3 3 5-6" /> },
  { label: "User Management", href: "/dashboard/users", roles: ["admin"], icon: <Icon d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
  { label: "Teams", href: "/dashboard/teams", roles: ["admin"], icon: <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
  { label: "Audit Logs", href: "/dashboard/audit-logs", roles: ["admin"], icon: <Icon d="M9 12h6m-6 4h6M8 4h8a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.87L12 18l-4.5 1.87A1 1 0 0 1 6 19V6a2 2 0 0 1 2-2Z" /> },
  { label: "Settings", href: "/dashboard/settings", roles: ["admin"], icon: <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /> },
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-panel min-h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md accent-gradient flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#14161C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" />
            </svg>
          </div>
          <span className="font-mono font-semibold tracking-tight text-sm">
            NetShield <span className="accent-gradient-text">AI</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-panel2 text-text border-l-2 border-violet -ml-px pl-[11px]"
                  : "text-muted hover:text-text hover:bg-panel2/50"
              }`}
            >
              <span className={active ? "text-violet" : "text-muted"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-line">
        <p className="text-xs text-muted font-mono truncate">{user.name}</p>
        <p className="text-[11px] mt-0.5">
          <span
            className={`inline-block px-1.5 py-0.5 rounded font-mono uppercase tracking-wide ${
              user.role === "admin" ? "bg-alert/10 text-alert" : "bg-signal/10 text-signal"
            }`}
          >
            {user.role}
          </span>
        </p>
      </div>
    </aside>
  );
}
