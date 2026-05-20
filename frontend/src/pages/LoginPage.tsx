import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Card, Button } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginRequested } from "../store/authActions";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) nav(loc.state?.from ?? "/", { replace: true });
  }, [user, nav, loc.state?.from]);

  return (
    <AuthLayout
      title="Sign in"
      subtitle="See your upcoming visits, your spot in line, and past appointments — all in one place."
    >
      <Card className="shadow-md dark:shadow-none">
        <form
          className="flex flex-col gap-4"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch(loginRequested({ email, password }));
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              autoComplete="off"
              name="login-email-no-autofill"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              autoComplete="new-password"
              name="login-password-no-autofill"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No account?{" "}
          <Link className="font-semibold text-teal-700 hover:underline dark:text-teal-400" to="/register">
            Create one
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
