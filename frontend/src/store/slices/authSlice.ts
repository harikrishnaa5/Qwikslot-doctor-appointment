import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../api/types";

export type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  token: localStorage.getItem("clinic_token"),
  user: (() => {
    try {
      const raw = localStorage.getItem("clinic_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  })(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      localStorage.setItem("clinic_token", action.payload.token);
      localStorage.setItem("clinic_user", JSON.stringify(action.payload.user));
    },
    clearCredentials(state) {
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem("clinic_token");
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
