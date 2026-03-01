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
  const { session, signUp, authError, clearAuthError } = useAuth();

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
