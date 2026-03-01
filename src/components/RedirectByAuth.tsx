import * as React from "react";
import { Navigate } from "react-router";

import { useAuth } from "../contexts/AuthContext";

/**
 * Renders at root path /. Redirects to /app if authenticated, /signin if not.
 * Shows nothing (or a minimal loading state) while auth is loading.
 */
export function RedirectByAuth() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/signin" replace />;
}
