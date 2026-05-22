import { apiFetch } from "./client";
import type { User } from "./types";

export type AuthTokensResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function loginRequest(email: string, password: string) {
  return apiFetch<AuthTokensResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
}

export async function registerRequest(name: string, email: string, password: string) {
  return apiFetch<AuthTokensResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
    token: null,
  });
}

export async function refreshSessionRequest(refreshToken: string) {
  return apiFetch<AuthTokensResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    token: null,
  });
}

export async function logoutRequest(refreshToken: string) {
  await apiFetch<void>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    token: null,
  });
}

export async function meRequest(accessToken: string) {
  return apiFetch<{ user: User }>("/api/v1/auth/me", { token: accessToken });
}
