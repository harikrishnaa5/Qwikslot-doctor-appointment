const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getStoredToken(): string | null {
  return localStorage.getItem("clinic_token");
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem("clinic_token", token);
  else localStorage.removeItem("clinic_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

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
