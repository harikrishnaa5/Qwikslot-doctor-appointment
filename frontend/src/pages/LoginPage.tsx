import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Card, Button } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginRequested } from "../store/authActions";
import { adminLoginRedirect } from "../lib/adminNav";

type LoginPageProps = {
  /** Staff portal sign-in (same auth + success toast as patient login). */
  variant?: "patient" | "admin" | "doctor";
};

export function LoginPage({ variant = "patient" }: LoginPageProps) {
  const isAdminPortal = variant === "admin";
  const isDoctorPortal = variant === "doctor";
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const loading = useAppSelector((s) => s.auth.loading);
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) nav(adminLoginRedirect(user.role, loc.state?.from), { replace: true });
  }, [user, nav, loc.state?.from]);

  return (
    <AuthLayout
      title="Sign in"
      subtitle={
        isDoctorPortal
          ? "Sign in to view your daily schedule and update patient visit status."
          : isAdminPortal
            ? "Sign in to manage departments, doctors, availability, and the live queue."
            : "See your upcoming visits, your spot in line, and past appointments — all in one place."
      }
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
            <div className="relative mt-1">
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-3 pr-11 text-base text-slate-900 outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                autoComplete="new-password"
                name="login-password-no-autofill"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {isAdminPortal ? (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Patient?{" "}
            <Link className="font-semibold text-teal-700 hover:underline dark:text-teal-400" to="/login">
              Sign in here
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            No account?{" "}
            <Link className="font-semibold text-teal-700 hover:underline dark:text-teal-400" to="/register">
              Create one
            </Link>
          </p>
        )}
      </Card>
    </AuthLayout>
  );
}
