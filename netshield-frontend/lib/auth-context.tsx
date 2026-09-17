"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken } from "@/lib/api";

type MeInfo = { id: number; name: string; email: string; role: "admin" | "analyst" };

type AuthContextValue = {
  user: MeInfo | null;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
