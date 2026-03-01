import * as React from "react";
import { useLocation, useNavigate } from "react-router";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import type { Database } from "../types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type UserRole = "solo" | "member" | "manager";

type SignInArgs =
  | { provider: "github"; redirectTo?: string }
  | { email: string; password: string };

type SignUpArgs = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  orgCode?: string;
  orgName?: string;
};

export function getAuthErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  role: UserRole;
  orgId: string | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  refetchProfile: () => Promise<void>;
  signIn: (args: SignInArgs) => Promise<void>;
  signUp: (args: SignUpArgs) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const sessionExpiredRef = React.useRef(false);
  const lastSessionRef = React.useRef<Session | null>(null);

  const clearAuthError = React.useCallback(() => setAuthError(null), []);

  const role: UserRole =
    (profile?.role as UserRole) ?? "solo";
  const orgId = profile?.org_id ?? null;

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        const sess = data.session ?? null;
        lastSessionRef.current = sess;
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!isMounted) return;
      if (lastSessionRef.current !== null && next === null) {
        sessionExpiredRef.current = true;
      }
      lastSessionRef.current = next;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refetchProfile = React.useCallback(async () => {
    if (!user?.id) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    let isMounted = true;
    fetchProfile(user.id).then((p) => {
      if (isMounted) setProfile(p);
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (loading) return;

    const isProtected = location.pathname.startsWith("/app");
    const isSignIn = location.pathname === "/signin";
    const isSignUp = location.pathname === "/signup";

    if (!session && isProtected) {
      const sessionExpired = sessionExpiredRef.current;
      sessionExpiredRef.current = false;
      navigate("/signin", {
        replace: true,
        state: { from: location, sessionExpired },
      });
      return;
    }

    if (session && (isSignIn || isSignUp)) {
      navigate("/app", { replace: true });
    }
  }, [loading, session, location, navigate]);

  const signIn = React.useCallback(
    async (args: SignInArgs) => {
      setAuthError(null);
      try {
        if ("provider" in args) {
          const redirectTo =
            args.redirectTo ?? `${window.location.origin}/app`;
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo },
          });
          if (error) {
            setAuthError(error.message);
            throw error;
          }
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: args.email,
          password: args.password,
        });
        if (error) {
          setAuthError(error.message);
          throw error;
        }
        navigate("/app", { replace: true });
      } catch (e) {
        setAuthError(getAuthErrorMessage(e));
        throw e;
      }
    },
    [navigate],
  );

  const signUp = React.useCallback(
    async (args: SignUpArgs) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email: args.email,
        password: args.password,
        options: {
          data: {
            full_name: args.name,
            role: args.role,
            org_name: args.orgName,
            org_id: args.orgCode,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }

      if (data.user && data.session) {
        const uid = data.user.id;
        const name =
          (data.user.user_metadata?.full_name as string) || args.name;
        const role = (data.user.user_metadata?.role as UserRole) || "solo";

        if (role === "manager" && args.orgName?.trim()) {
          const { data: org } = await supabase
            .from("organisations")
            .insert({
              name: args.orgName.trim(),
              created_by: uid,
            })
            .select("id")
            .single();
          if (org) {
            await supabase.from("profiles").upsert({
              id: uid,
              name,
              role,
              org_id: org.id,
            });
          }
        } else if (role === "member" && args.orgCode?.trim()) {
          await supabase.from("profiles").upsert({
            id: uid,
            name,
            role,
            org_id: args.orgCode.trim(),
          });
        } else {
          await supabase.from("profiles").upsert({
            id: uid,
            name,
            role: "solo",
          });
        }
        navigate("/app", { replace: true });
      }
    },
    [navigate],
  );

  const signOut = React.useCallback(async () => {
    setAuthError(null);
    sessionExpiredRef.current = false;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    navigate("/signin", { replace: true, state: { sessionExpired: false } });
  }, [navigate]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      role,
      orgId,
      loading,
      authError,
      clearAuthError,
      refetchProfile,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      session,
      profile,
      role,
      orgId,
      loading,
      authError,
      clearAuthError,
      refetchProfile,
      signIn,
      signUp,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
