import { supabase } from "./supabase";

export type SupabaseErrorLike = { message?: string; code?: string; details?: string; status?: number } | null | undefined;

/**
 * Returns true if the error indicates session expiry (401 or JWT expired).
 * Callers should sign out and redirect to signin with sessionExpired: true.
 */
export function isSessionExpiredError(error: SupabaseErrorLike): boolean {
  if (error == null) return false;
  const status = (error as { status?: number }).status;
  if (status === 401) return true;
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return msg.includes("jwt expired") || code.includes("jwt_expired");
}

/**
 * Returns a human-readable string for Supabase/client errors.
 * Never exposes raw internal messages; sanitizes for display.
 */
export function parseSupabaseError(error: SupabaseErrorLike): string {
  if (error == null) return "An unexpected error occurred.";
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  const details = (error.details ?? "").toLowerCase();

  if (msg.includes("jwt expired") || code.includes("jwt_expired")) {
    return "Your session has expired. Please sign in again.";
  }
  if (
    msg.includes("duplicate key") ||
    details.includes("duplicate") ||
    code === "23505"
  ) {
    return "This record already exists.";
  }
  if (
    msg.includes("violates foreign key") ||
    msg.includes("foreign key") ||
    code === "23503"
  ) {
    return "Related record not found. Try refreshing.";
  }
  if (
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch")
  ) {
    return "Connection lost. Check your internet and try again.";
  }
  if (
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("rls") ||
    code === "42501"
  ) {
    return "You do not have access to this data.";
  }
  if (msg.includes("too many requests") || code === "429") {
    return "Too many requests. Wait a moment and try again.";
  }
  if (error.message && typeof error.message === "string") {
    return sanitizeMessage(error.message);
  }
  return "An unexpected error occurred.";
}

function sanitizeMessage(raw: string): string {
  const max = 200;
  let s = raw.trim();
  if (s.length > max) s = s.slice(0, max) + "...";
  return s;
}

const isDev = import.meta.env.DEV;

/**
 * Logs errors. In development logs to console.
 * In production sends to error_logs table (no journal/content).
 */
export function logError(context: string, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error != null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  if (isDev) {
    console.error(`[${context}]`, error);
    return;
  }
  supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id ?? null;
    supabase
      .from("error_logs")
      .insert({
        user_id: userId,
        context,
        message: message.slice(0, 1000),
      })
      .then(() => {})
      .catch(() => {});
  });
}
