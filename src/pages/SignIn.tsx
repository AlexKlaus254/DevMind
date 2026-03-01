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
