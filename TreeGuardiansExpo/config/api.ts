import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_NATIVE_API_ORIGIN = "http://localhost:4000";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function getWindowOrigin(): string | null {
  if (Platform.OS !== "web") {
    return null;
  }

  if (typeof window === "undefined" || !window.location?.origin) {
    return null;
  }
  return trimTrailingSlashes(window.location.origin);
}

function getExpoHostOrigin(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest && "hostUri" in Constants.manifest ? Constants.manifest.hostUri : undefined);

  if (typeof hostUri !== "string" || !hostUri.trim()) {
    return null;
  }

  const trimmedHost = hostUri.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmedHost) {
    return null;
  }

  return `http://${trimmedHost}`;
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

function rewriteLocalhostForNative(value: string): string {
  if (Platform.OS === "web") {
    return value;
  }

  const expoHostOrigin = getExpoHostOrigin();
  if (!expoHostOrigin) {
    return value;
  }

  return value.replace(/^(https?):\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, (_match, protocol, _host, port) => {
    const expoUrl = new URL(expoHostOrigin);
    const nextPort = port || "";
    return `${protocol}://${expoUrl.hostname}${nextPort}`;
  });
}

export function resolveApiBaseUrl(): string {
  const windowOrigin = getWindowOrigin();
  if (windowOrigin) {
    const isLocalhost =
      windowOrigin.startsWith("http://localhost:") ||
      windowOrigin.startsWith("https://localhost:") ||
      windowOrigin.startsWith("http://127.0.0.1:") ||
      windowOrigin.startsWith("https://127.0.0.1:");

    if (!isLocalhost) {
      return `${windowOrigin}/api`;
    }

    const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (typeof envBase === "string" && envBase.trim()) {
      return normalizeApiBase(rewriteLocalhostForNative(envBase));
    }

    const envOrigin = process.env.EXPO_PUBLIC_API_ORIGIN;
    if (typeof envOrigin === "string" && envOrigin.trim()) {
      const origin = normalizeOrigin(rewriteLocalhostForNative(envOrigin));
      return `${origin}/api`;
    }

    return `${windowOrigin}/api`;
  }

  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof envBase === "string" && envBase.trim()) {
    return normalizeApiBase(rewriteLocalhostForNative(envBase));
  }

  const envOrigin = process.env.EXPO_PUBLIC_API_ORIGIN;
  if (typeof envOrigin === "string" && envOrigin.trim()) {
    const origin = normalizeOrigin(rewriteLocalhostForNative(envOrigin));
    return `${origin}/api`;
  }

  return `${rewriteLocalhostForNative(DEFAULT_NATIVE_API_ORIGIN)}/api`;
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
  VALIDATE_SESSION: "users/me",
  LOGOUT: "auth/logout",
  USERS_ME: "users/me",
  ACCOUNT_USERNAME: "account/username",
  ACCOUNT_EMAIL: "account/email",
  ACCOUNT_PASSWORD: "account/password",
  ACCOUNT_DELETE: "account/delete",
  AUTH_VERIFY_EMAIL: "auth/verify-email",
  AUTH_FORGOT_PASSWORD: "auth/forgot-password",
  AUTH_RESET_PASSWORD: "auth/reset-password",
} as const;
