/**
 * Sign in page. Minimal, dark. GitHub primary, email/password secondary.
 * Errors use Supabase message via AuthContext authError.
 */
import * as React from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Brain, Github } from "lucide-react";

import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signIn, authError, clearAuthError } = useAuth();
  const sessionExpired = (location.state as { sessionExpired?: boolean } | null)?.sessionExpired === true;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) navigate("/app", { replace: true });
  }, [session, navigate]);

  const onGithub = async () => {
    setSubmitting(true);
    clearAuthError();
    setResetSent(false);
    setResetError(null);
    try {
      await signIn({ provider: "github" });
    } catch {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setSubmitting(true);
    clearAuthError();
    setResetSent(false);
    setResetError(null);
    try {
      await signIn({
        provider: "google",
        redirectTo: `${window.location.origin}/app`,
      });
    } catch {
      setSubmitting(false);
    }
  };

  const onEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearAuthError();
    setResetSent(false);
    setResetError(null);
    try {
      await signIn({ email, password });
      navigate("/app", { replace: true });
    } catch {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setResetError("Enter your email above first.");
      return;
    }
    setResetError(null);
    setResetSent(false);
    clearAuthError();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/signin`,
    });
    if (error) {
      setResetError(error.message);
      return;
    }
    setResetSent(true);
  };

  const displayError = authError ?? resetError;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-semibold">DevMind</span>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          <h1 className="text-xl font-semibold">Sign in</h1>

          {sessionExpired && (
            <div className="text-sm rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-4 py-3">
              Your session expired. Sign in again.
            </div>
          )}

          {resetSent && (
            <div className="text-sm rounded-md border border-success/30 bg-success/10 text-success px-4 py-3">
              Check your email for a link to reset your password.
            </div>
          )}

          {displayError && (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
              {displayError}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={onGithub}
            disabled={submitting}
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </Button>

          <Button
            type="button"
            className="w-full"
            size="lg"
            variant="outline"
            onClick={onGoogle}
            disabled={submitting}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="text-xs text-muted-foreground">or</div>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onEmailPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              Sign in with email
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
