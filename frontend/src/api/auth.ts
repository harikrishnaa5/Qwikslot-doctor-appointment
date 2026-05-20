import { apiFetch } from "./client";
import type { User } from "./types";

export async function loginRequest(email: string, password: string) {
  return apiFetch<{ user: User; token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export async function registerRequest(name: string, email: string, password: string) {
  return apiFetch<{ user: User; token: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
    token: null,
  });
}

export async function meRequest(token: string) {
  return apiFetch<{ user: User }>("/api/v1/auth/me", { token });
}
