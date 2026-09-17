"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Topbar from "../Topbar";

type Team = {
  id: number;
  name: string;
  description: string | null;
  members: { id: number; name: string; email: string; role: string }[];
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  async function loadTeams() {
    try {
      const response = await api.get("/teams");
      setTeams(response.data.results || []);
    } catch {
      setError("Unable to load teams. Administrator access is required.");
    }
  }

  async function loadUsers() {
    try {
      const response = await api.get("/users");
      setUsers(response.data || []);
    } catch {
      setError("Unable to load users for team assignment.");
    }
  }

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  async function createTeam(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/teams", { name, description: description || null });
      setName("");
      setDescription("");
      setError("");
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Unable to create team.");
    }
  }

  async function addMember(teamId: number) {
    const userId = Number(selectedUsers[teamId]);
    if (!userId) return;

    try {
      await api.post(`/teams/${teamId}/members`, { user_id: userId });
      setSelectedUsers((current) => ({ ...current, [teamId]: "" }));
      setError("");
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Unable to add team member.");
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Teams" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="font-mono text-signal text-xs tracking-widest uppercase mb-3">TEAM MANAGEMENT</p>
        <h1 className="text-2xl font-semibold mb-2">Security teams</h1>
        <p className="text-muted text-sm mb-6">Organize analysts responsible for threat response.</p>

        {error && <p className="text-critical text-sm mb-4">{error}</p>}
        <form onSubmit={createTeam} className="border border-line rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Team name" className="bg-panel2 border border-line rounded px-3 py-2 text-sm" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="bg-panel2 border border-line rounded px-3 py-2 text-sm flex-1" />
          <button className="bg-violet text-white rounded px-4 py-2 text-sm" type="submit">Create team</button>
        </form>

        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="border border-line rounded-lg p-4 bg-panel">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{team.name}</h2>
                  <p className="text-muted text-sm mt-1">{team.description || "No description"}</p>
                </div>
                <span className="text-xs text-muted">{team.members.length} members</span>
              </div>
              {team.members.length > 0 && (
                <p className="text-xs text-muted mt-3">{team.members.map((member) => member.name).join(", ")}</p>
              )}
              <div className="flex gap-2 mt-4">
                <select
                  value={selectedUsers[team.id] || ""}
                  onChange={(event) =>
                    setSelectedUsers((current) => ({
                      ...current,
                      [team.id]: event.target.value,
                    }))
                  }
                  className="bg-panel2 border border-line rounded px-3 py-2 text-sm flex-1"
                >
                  <option value="">Select analyst or admin</option>
                  {users
                    .filter((user) => !team.members.some((member) => member.id === user.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => addMember(team.id)}
                  disabled={!selectedUsers[team.id]}
                  className="border border-violet/50 text-violet rounded px-3 py-2 text-sm disabled:opacity-40"
                >
                  Add member
                </button>
              </div>
            </div>
          ))}
          {teams.length === 0 && <p className="text-muted text-sm">No teams created yet.</p>}
        </div>
      </main>
    </div>
  );
}