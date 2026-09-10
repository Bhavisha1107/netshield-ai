import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Create API instance
export const api = axios.create({
  baseURL: API_BASE,
});

// ================================
// TOKEN FUNCTIONS
// ================================

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("netshield_token");
}

export function saveToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("netshield_token", token);
}

// Keep this also in case other files use setToken
export function setToken(token: string) {
  saveToken(token);
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("netshield_token");
}

// ================================
// ADD JWT TOKEN TO EVERY REQUEST
// ================================

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});