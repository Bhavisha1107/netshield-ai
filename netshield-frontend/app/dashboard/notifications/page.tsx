"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Topbar from "../Topbar";

type Notification = {
  id: number;
  alert_id: number | null;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.results || []);
      setUnreadCount(response.data.unread_count || 0);
      setError("");
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markRead(notification: Notification) {
    if (notification.is_read) return;
    await api.put(`/notifications/${notification.id}/read`);
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await api.put("/notifications/read-all");
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Notifications" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">
              SECURITY NOTIFICATIONS
            </p>
            <h1 className="text-2xl font-semibold">Threat notifications</h1>
            <p className="text-muted text-sm mt-2">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="border border-line rounded-md px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
          >
            Mark all read
          </button>
        </div>

        {error && <p className="text-critical mb-4">{error}</p>}
        {loading && <p className="text-muted">Loading notifications...</p>}
        {!loading && notifications.length === 0 && (
          <div className="border border-line rounded-lg p-8 text-center text-muted">
            No security notifications yet.
          </div>
        )}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markRead(notification)}
              className={`w-full text-left border rounded-lg p-4 transition-colors ${
                notification.is_read
                  ? "border-line bg-panel"
                  : "border-orange-500/40 bg-orange-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="text-sm text-muted mt-1">{notification.message}</p>
                </div>
                <span className="text-xs font-mono text-orange-400">
                  {notification.severity}
                </span>
              </div>
              <p className="text-xs text-muted mt-3">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}