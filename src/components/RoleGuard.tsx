import * as React from "react";
import { Navigate } from "react-router";

import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

/**
 * Renders children only when the current user has the required role.
 * Managers see Team dashboard; solo and member do not.
 */
export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (role !== requiredRole) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
