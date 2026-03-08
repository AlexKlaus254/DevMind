/**
 * Sign up page. Full name, email, password, confirm password.
 * Role selector: Individual (solo), Team Member (member) with org code,
 * Organisation Manager (manager) with org name. After signup, auto sign in
 * and redirect to /app when email confirmation is disabled.
 */
import * as React from "react";
import { Link, useNavigate } from "react-router";
import { Brain } from "lucide-react";

import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";

export default function SignUp() {
  const navigate = useNavigate();
  const { session, signUp, signIn, authError, clearAuthError } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("solo");
  const [orgCode, setOrgCode] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (session) navigate("/app", { replace: true });
  }, [session, navigate]);

  const errorMessage = authError ?? validationError;

  const handleGithubOAuth = async () => {
    clearAuthError();
    setValidationError(null);
    setSubmitting(true);
    try {
      await signIn({ provider: "github" });
    } catch {
      setSubmitting(false);
    }
  };

  const handleGoogleOAuth = async () => {
    clearAuthError();
    setValidationError(null);
    setSubmitting(true);
    try {
      await signIn({
        provider: "google",
        redirectTo: `${window.location.origin}/app`,
      });
    } catch {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setValidationError(null);

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    if (role === "member" && !orgCode.trim()) {
      setValidationError("Enter your organisation invite code.");
      return;
    }
    if (role === "manager" && !orgName.trim()) {
      setValidationError("Enter your organisation name.");
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        name,
        email,
        password,
        role,
        orgCode: role === "member" ? orgCode.trim() : undefined,
        orgName: role === "manager" ? orgName.trim() : undefined,
      });
      setSuccess(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (success) {
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
            <div className="text-sm rounded-md border border-success/30 bg-success/10 text-success px-4 py-3">
              Account created. Check your email to confirm then sign in, or sign in directly if confirmation is disabled.
            </div>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to activate your account, then sign in.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link to="/signin">Go to Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold">Sign up</h1>

          {errorMessage && (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={handleGithubOAuth}
              disabled={submitting}
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.37-3.88-1.37-.53-1.35-1.29-1.71-1.29-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.41-5.26 5.69.42.36.8 1.09.8 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
                />
              </svg>
              Continue with GitHub
            </Button>

            <Button
              type="button"
              className="w-full"
              size="lg"
              variant="outline"
              onClick={handleGoogleOAuth}
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
              <div className="text-xs text-muted-foreground">or use email</div>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                className="bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="bg-background"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label>I am joining as</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="role"
                    value="solo"
                    checked={role === "solo"}
                    onChange={() => setRole("solo")}
                    className="text-primary"
                  />
                  <span className="text-sm">Individual (solo)</span>
                </label>
                <label className="flex items-center gap-3 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === "member"}
                    onChange={() => setRole("member")}
                    className="text-primary"
                  />
                  <span className="text-sm">Team Member</span>
                </label>
                {role === "member" && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="orgCode" className="text-xs">
                      Organisation invite code
                    </Label>
                    <Input
                      id="orgCode"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value)}
                      placeholder="Paste code from your team"
                      className="bg-background text-sm"
                    />
                  </div>
                )}
                <label className="flex items-center gap-3 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="role"
                    value="manager"
                    checked={role === "manager"}
                    onChange={() => setRole("manager")}
                    className="text-primary"
                  />
                  <span className="text-sm">Organisation Manager</span>
                </label>
                {role === "manager" && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="orgName" className="text-xs">
                      Organisation name
                    </Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Create your organisation"
                      className="bg-background text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
