import * as React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { NetworkStatus } from "../../components/NetworkStatus";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  Brain,
  FileText,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { Avatar } from "./ui/avatar";
import { useAuth } from "../../contexts/AuthContext";

const baseNavItems = [
  { path: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/app/projects", icon: FolderKanban, label: "Projects" },
  { path: "/app/journal", icon: BookOpen, label: "Journal" },
  { path: "/app/insights", icon: Brain, label: "Insights" },
  { path: "/app/digest", icon: FileText, label: "Digest" },
  { path: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, user, signOut } = useAuth();

  React.useEffect(() => {
    if (profile && profile.onboarding_complete !== true) {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, navigate]);

  if (profile && profile.onboarding_complete !== true) {
    return null;
  }

  const navItems =
    role === "manager"
      ? [
          ...baseNavItems.slice(0, 4),
          { path: "/app/team", icon: Users, label: "Team" },
          ...baseNavItems.slice(4),
        ]
      : baseNavItems;

  const isActive = (path: string) => {
    if (path === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(path);
  };

  const displayName =
    profile?.name ?? user?.user_metadata?.full_name ?? "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleLabel =
    role === "manager"
      ? "Manager"
      : role === "member"
        ? "Member"
        : "Solo";

  return (
    <div className="flex h-screen bg-background">
      <NetworkStatus />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">DevMind</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-r-lg transition-colors border-l-4 ${
                isActive(item.path)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="w-8 h-8 bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {initials}
              </span>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - 5 icons max */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
        <div className="flex items-center justify-around p-2">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "text-primary border-t-2 border-primary pt-0"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
