const DEFAULT_NATIVE_API_ORIGIN = "http://localhost:4000";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function getWindowOrigin(): string | null {
  if (typeof window === "undefined" || !window.location?.origin) {
    return null;
  }
  return trimTrailingSlashes(window.location.origin);
}

function normalizeOrigin(value: string): string {
  const trimmed = trimTrailingSlashes(value.trim());
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

function normalizeApiBase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const absolute = trimTrailingSlashes(trimmed);
    return absolute.endsWith("/api") ? absolute : `${absolute}/api`;
  }

  if (trimmed.startsWith("/")) {
    const origin = getWindowOrigin() || DEFAULT_NATIVE_API_ORIGIN;
    const relative = trimTrailingSlashes(trimmed);
    return relative.endsWith("/api") ? `${origin}${relative}` : `${origin}${relative}/api`;
  }

  const withScheme = `https://${trimmed}`;
  const absolute = trimTrailingSlashes(withScheme);
  return absolute.endsWith("/api") ? absolute : `${absolute}/api`;
}

export function resolveApiBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof envBase === "string" && envBase.trim()) {
    return normalizeApiBase(envBase);
  }

  const envOrigin = process.env.EXPO_PUBLIC_API_ORIGIN;
  if (typeof envOrigin === "string" && envOrigin.trim()) {
    const origin = normalizeOrigin(envOrigin);
    return `${origin}/api`;
  }

  const windowOrigin = getWindowOrigin();
  if (windowOrigin) {
    return `${windowOrigin}/api`;
  }

  return `${DEFAULT_NATIVE_API_ORIGIN}/api`;
}

export function resolveApiOrigin(): string {
  return normalizeOrigin(resolveApiBaseUrl());
}

export function buildApiUrl(path: string): string {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const base = resolveApiBaseUrl();
  return cleanPath ? `${base}/${cleanPath}` : base;
}

export const API_BASE = `${resolveApiBaseUrl()}/`;
export const API_ORIGIN = resolveApiOrigin();

export const ENDPOINTS = {
  ADD_TREE_DATA: "trees",
  DB: "db",
  GET_TREES: "trees",
  UPLOAD_PHOTOS: "upload-photos",
  TREES: "trees",
  AUTH_LOGIN: "auth/login",
  AUTH_REGISTER: "auth/register",
  USERS_ME: "users/me"
} as const;