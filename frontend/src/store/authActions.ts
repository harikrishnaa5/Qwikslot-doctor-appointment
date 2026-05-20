import { createAction } from "@reduxjs/toolkit";

export const loginRequested = createAction<{ email: string; password: string }>("auth/loginRequested");
export const registerRequested = createAction<{ name: string; email: string; password: string }>(
  "auth/registerRequested"
);
