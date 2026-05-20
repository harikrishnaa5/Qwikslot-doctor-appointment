import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

function readStored(): ThemeMode {
  const v = localStorage.getItem("clinic_theme");
  return v === "dark" || v === "light" ? v : "light";
}

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: readStored() } as { mode: ThemeMode },
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      localStorage.setItem("clinic_theme", action.payload);
    },
    toggleTheme(state) {
      state.mode = state.mode === "light" ? "dark" : "light";
      localStorage.setItem("clinic_theme", state.mode);
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
