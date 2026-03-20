import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { token, login, loading, error } = useAuth();
  const [email, setEmail] = useState("parent@example.com");
  const [password, setPassword] = useState("Parent@123");

  if (token) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    await login(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="bg-primary px-8 py-10 text-slate-100">
            <div className="mb-4 inline-flex rounded-full bg-white/10 p-3" data-testid="login-shield-icon">
              <Shield className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold" data-testid="login-title">
              FamilyGuard
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-200" data-testid="login-subtitle">
              A secure parental command center to track activity, monitor location, and send remote guidance.
            </p>
          </div>

          <form className="space-y-5 px-8 py-10" onSubmit={onSubmit} data-testid="login-form">
            <h2 className="text-2xl font-bold" data-testid="login-form-heading">
              Parent Login
            </h2>
            <label className="block text-sm font-medium text-slate-700" data-testid="login-email-label">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition-colors duration-200 focus:border-primary"
                data-testid="login-email-input"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" data-testid="login-password-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition-colors duration-200 focus:border-primary"
                data-testid="login-password-input"
                required
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600" data-testid="login-error-message">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800 disabled:opacity-60"
              data-testid="login-submit-button"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.5} />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
