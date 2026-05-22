import { useEffect, useRef } from "react";
import { refreshSessionRequest } from "../api/auth";
import { getStoredAccessToken, getStoredRefreshToken } from "../api/client";
import { isAccessTokenExpired } from "../lib/accessToken";
import { useAppDispatch } from "../store/hooks";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";

/** Restore session from refresh token on load; clear state when refresh fails. */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const storedRefresh = getStoredRefreshToken();
    const access = getStoredAccessToken();
    if (!storedRefresh) return;
    if (access && !isAccessTokenExpired(access)) return;

    void (async () => {
      try {
        const res = await refreshSessionRequest(storedRefresh);
        dispatch(
          setCredentials({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            user: res.user,
          })
        );
      } catch {
        dispatch(clearCredentials());
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    const onExpired = () => dispatch(clearCredentials());
    window.addEventListener("auth:session-expired", onExpired);
    return () => window.removeEventListener("auth:session-expired", onExpired);
  }, [dispatch]);

  return null;
}
