import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Card, Button } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { registerRequested } from "../store/authActions";
import { adminLoginRedirect } from "../lib/adminNav";

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) nav(adminLoginRedirect(user.role), { replace: true });
  }, [user, nav]);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Create a free account to book visits, pay online when needed, and get updates while you wait."
    >
      <Card className="shadow-md dark:shadow-none">
        <form
          className="flex flex-col gap-4"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch(registerRequested({ name, email, password }));
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full name
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              autoComplete="off"
              name="register-email-no-autofill"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password (min 8 characters)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              autoComplete="new-password"
              name="register-password-no-autofill"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link className="font-semibold text-teal-700 hover:underline dark:text-teal-400" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
