const API_BASE = import.meta.env.VITE_API_URL ?? "";

const ACCESS_KEY = "clinic_access_token";
const REFRESH_KEY = "clinic_refresh_token";
const LEGACY_TOKEN_KEY = "clinic_token";

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setStoredTokens(accessToken: string | null, refreshToken: string | null) {
  if (accessToken) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } else {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

export function clearStoredTokens() {
  setStoredTokens(null, null);
}

/** @deprecated Use getStoredAccessToken */
export function getStoredToken(): string | null {
  return getStoredAccessToken();
}

/** @deprecated Use setStoredTokens */
export function setStoredToken(token: string | null) {
  setStoredTokens(token, getStoredRefreshToken());
}

export type AuthTokensPayload = {
  accessToken: string;
  refreshToken: string;
};

let refreshInFlight: Promise<AuthTokensPayload | null> | null = null;

async function refreshTokensRequest(refreshToken: string): Promise<AuthTokensPayload | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const text = await res.text();
  if (!res.ok) return null;
  const data = text ? (JSON.parse(text) as { accessToken: string; refreshToken: string }) : null;
  if (!data?.accessToken || !data?.refreshToken) return null;
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = refreshTokensRequest(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }

  const tokens = await refreshInFlight;
  if (!tokens) {
    clearStoredTokens();
    return null;
  }
  setStoredTokens(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; _retry?: boolean } = {}
): Promise<T> {
  const token = options.token ?? getStoredAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (res.status === 401 && !options._retry && !path.includes("/auth/refresh")) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiFetch<T>(path, { ...options, token: newAccess, _retry: true });
    }
    window.dispatchEvent(new Event("auth:session-expired"));
  }

  if (!res.ok) {
    const err = data as { error?: string; details?: unknown } | null;
    const msg = err?.error ?? res.statusText;
    const e = new Error(msg) as Error & { status?: number; details?: unknown };
    e.status = res.status;
    e.details = err?.details;
    throw e;
  }
  return data as T;
}
