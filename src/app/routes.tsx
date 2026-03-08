import * as React from "react";
import { createBrowserRouter, Outlet } from "react-router";

import { AuthProvider } from "../contexts/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RedirectByAuth } from "../components/RedirectByAuth";
import { RoleGuard } from "../components/RoleGuard";
import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";

import { Layout } from "./components/layout";
import { Dashboard } from "./pages/dashboard";
import { Journal } from "./pages/journal";
import { DailyTasksPage } from "./pages/daily-tasks";
import { ProjectList } from "./pages/project-list";
import { NewProject } from "./pages/new-project";
import { JournalCheckin } from "./pages/journal-checkin";
import { DeepReflection } from "./pages/deep-reflection";
import { ProjectPostMortem } from "./pages/project-post-mortem";
import { ProjectDetail } from "./pages/project-detail";
import { ProjectCompare } from "./pages/project-compare";
import { InsightsDashboard } from "./pages/insights-dashboard";
import { WeeklyDigest } from "./pages/weekly-digest";
import { ExportSummary } from "./pages/export-summary";
import { Settings } from "./pages/settings";
import { TeamView } from "./pages/team-view";
import { NotFound } from "./pages/not-found";
import { Onboarding } from "./pages/onboarding";

/**
 * Router structure:
 *
 * AuthProvider (wraps everything once at root)
 * ├── /             → RedirectByAuth (logged in → /app, not logged in → /signin)
 * ├── /signin       → SignIn (redirects to /app if already logged in)
 * ├── /signup       → SignUp (redirects to /app if already logged in)
 * ├── /app          → ProtectedRoute → Layout (Outlet) — all children require auth
 * │   ├── index     → Dashboard
 * │   ├── projects  → ProjectList
 * │   ├── projects/new → NewProject
 * │   ├── projects/:id/checkin   → JournalCheckin
 * │   ├── projects/:id/reflection → DeepReflection
 * │   ├── projects/:id/post-mortem → ProjectPostMortem
 * │   ├── insights  → InsightsDashboard
 * │   ├── settings  → Settings
 * │   └── team      → TeamView
 * └── *             → NotFound
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        index: true,
        element: <RedirectByAuth />,
      },
      {
        path: "signin",
        element: <SignIn />,
      },
      {
        path: "signup",
        element: <SignUp />,
      },
      {
        path: "onboarding",
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        path: "app",
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "projects",
            element: <ProjectList />,
          },
          {
            path: "projects/new",
            element: <NewProject />,
          },
          {
            path: "projects/:id",
            element: <ProjectDetail />,
          },
          {
            path: "compare",
            element: <ProjectCompare />,
          },
          {
            path: "projects/:id/checkin",
            element: <JournalCheckin />,
          },
          {
            path: "projects/:id/reflection",
            element: <DeepReflection />,
          },
          {
            path: "projects/:id/post-mortem",
            element: <ProjectPostMortem />,
          },
          {
            path: "journal",
            element: <Journal />,
          },
          {
            path: "tasks",
            element: <DailyTasksPage />,
          },
          {
            path: "insights",
            element: <InsightsDashboard />,
          },
          {
            path: "digest",
            element: <WeeklyDigest />,
          },
          {
            path: "export",
            element: <ExportSummary />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "team",
            element: <TeamView />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
