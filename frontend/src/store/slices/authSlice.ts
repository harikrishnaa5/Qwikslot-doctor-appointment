import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../api/types";
import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens } from "../../api/client";

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
};

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("clinic_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  accessToken: getStoredAccessToken(),
  refreshToken: getStoredRefreshToken(),
  user: loadStoredUser(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: User }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.error = null;
      setStoredTokens(action.payload.accessToken, action.payload.refreshToken);
      localStorage.setItem("clinic_user", JSON.stringify(action.payload.user));
    },
    clearCredentials(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.error = null;
      clearStoredTokens();
      localStorage.removeItem("clinic_user");
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, setAuthLoading, setAuthError } = authSlice.actions;
export default authSlice.reducer;
