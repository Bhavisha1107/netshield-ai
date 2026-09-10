"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Topbar from "../Topbar";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "analyst";
  created_at: string;
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
      setError("");
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "Administrator access required to view this page."
          : "Unable to load users."
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleRole(u: User) {
    const newRole = u.role === "admin" ? "analyst" : "admin";
    setUpdating(u.id);
    try {
      await api.post(`/users/${u.id}/role`, { role: newRole });
      await fetchUsers();
    } catch {
      setError("Failed to update role.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar title="User Management" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-critical/10 border border-critical/30 text-critical text-sm rounded-md px-4 py-3 mb-6 font-mono">
            {error}
          </div>
        )}

        <div className="bg-panel border border-line rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">
              Registered Users ({users.length})
            </h2>
          </div>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-muted text-xs uppercase border-b border-line">
                <th className="text-left px-5 py-2.5 font-medium">Name</th>
                <th className="text-left px-5 py-2.5 font-medium">Email</th>
                <th className="text-left px-5 py-2.5 font-medium">Role</th>
                <th className="text-left px-5 py-2.5 font-medium">Joined</th>
                <th className="text-left px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/50 hover:bg-panel2 transition-colors">
                  <td className="px-5 py-2.5 text-text">{u.name}</td>
                  <td className="px-5 py-2.5 text-muted">{u.email}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full uppercase ${
                        u.role === "admin" ? "bg-alert/10 text-alert" : "bg-signal/10 text-signal"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2.5">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={updating === u.id || u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "You cannot change your own role" : ""}
                      className="text-xs border border-line rounded px-2.5 py-1 text-muted hover:text-text hover:border-signal/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {updating === u.id
                        ? "Updating..."
                        : u.role === "admin"
                        ? "Demote to Analyst"
                        : "Promote to Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
