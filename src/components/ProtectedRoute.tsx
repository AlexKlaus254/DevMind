import * as React from "react";
import { Navigate, useLocation } from "react-router";

import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate to="/signin" replace state={{ from: location }} />
    );
  }

  return <>{children}</>;
}

