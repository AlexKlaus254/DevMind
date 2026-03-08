import * as React from "react";
import { Link } from "react-router";
import { FolderKanban, Target, Calendar, BookOpen, Plus } from "lucide-react";
import { StatCard } from "../components/devmind/stat-card";
import { Button } from "../components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { useAiInsight } from "../../hooks/useAiInsight";
import {
  getSilentDaysForProject,
  getLastEntryGap,
} from "../../lib/silenceUtils";
import { useEmotionalArc } from "../../hooks/useEmotionalArc";
import { useDailyTasks } from "../../hooks/useDailyTasks";

export function Dashboard() {
  const { projects, loading } = useProjects();
  const { entries, entriesByProject } = useAllJournalEntries();
  const { insight, loading: insightLoading, fetchLatest } = useAiInsight();
  const {
    arcData,
    loading: arcLoading,
  } = useEmotionalArc();
  const {
    tasks: todayTasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasksForDate: fetchTasksForToday,
    updateTaskStatus: updateTaskStatusInline,
  } = useDailyTasks();

  const activeProjects = projects.filter((p) => p.status === "active");
  const activeCount = activeProjects.length;
  const totalProjects = projects.length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const completionRate =
    totalProjects === 0 ? null : Math.round((completedCount / totalProjects) * 100);
  const completionRateAbove50 = completionRate != null && completionRate >= 50;

  const silentDays = activeProjects.reduce((sum, p) => {
    const entries = entriesByProject.get(p.id) ?? [];
    const started = p.started_at ?? p.created_at ?? "";
    if (!started) return sum;
    return sum + getSilentDaysForProject(entries, started);
  }, 0);
  const silentDaysOver7 = silentDays > 7;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const journalEntriesThisMonth = entries.filter((e) => {
    if (!e.created_at) return false;
    const d = new Date(e.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  React.useEffect(() => {
    const todayIso = new Date().toISOString().split("T")[0]!;
    fetchTasksForToday(todayIso);
  }, [fetchTasksForToday]);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Project Overview</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted/50 animate-pulse mt-8" />
        </div>
      </div>
    );
  }

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, 3);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Project Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Metrics across all projects
              </p>
            </div>
            <Link to="/app/projects/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {projects.length === 0 && (
          <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
            Your baseline is set. Create your first project to start tracking.
          </div>
        )}
        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Projects"
            value={activeCount}
            icon={FolderKanban}
          />
          <StatCard
            title="Completion Rate"
            value={completionRate != null ? `${completionRate}%` : "—"}
            icon={Target}
            trend={
              completionRate != null
                ? {
                    value: completionRateAbove50 ? "Above 50%" : "Below 50%",
                    positive: completionRateAbove50,
                  }
                : undefined
            }
          />
          <div
            className={`bg-card border rounded-lg p-6 transition-opacity duration-150 ${
              silentDaysOver7 ? "border-destructive/50" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-sm text-muted-foreground">Silent Days</div>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div
              className={`text-3xl font-mono ${
                silentDaysOver7 ? "text-destructive" : "text-foreground"
              }`}
            >
              {silentDays}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Total days with no entry across active projects
            </div>
          </div>
          <StatCard
            title="Journal Entries This Month"
            value={journalEntriesThisMonth}
            icon={BookOpen}
          />
        </div>

        {/* Today's tasks widget */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Today's tasks</h3>
            <Link
              to="/app/tasks"
              className="text-xs text-primary hover:underline"
            >
              Open tasks page
            </Link>
          </div>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-md bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : tasksError ? (
            <p className="text-xs text-destructive">
              Failed to load tasks.
            </p>
          ) : todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks scheduled for today.
            </p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{t.title}</div>
                    {t.planned_start_time && (
                      <div className="text-muted-foreground">
                        {t.planned_start_time.slice(0, 5)}
                      </div>
                    )}
                  </div>
                  {t.status !== "completed" && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        updateTaskStatusInline(t.id, "completed")
                      }
                    >
                      Done
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Emotional Arc */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-6">
            Project emotional arc
          </h3>
          {arcLoading ? (
            <div className="h-64 rounded-lg bg-muted/50 animate-pulse" />
          ) : arcData.length < 3 ? (
            <p className="text-muted-foreground py-8 text-center">
              Log at least 3 check-ins to see your emotional arc.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={arcData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#30363D"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#8B949E"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#8B949E"
                    style={{ fontSize: "12px" }}
                    domain={[1, 10]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161B22",
                      border: "1px solid #30363D",
                      borderRadius: "8px",
                      color: "#E6EDF3",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="#6C63FF"
                    strokeWidth={2}
                    name="Energy"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#3FB950"
                    strokeWidth={2}
                    name="Confidence"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* AI Insight */}
        <div className="bg-card border border-border rounded-lg p-6 border-l-4 border-l-primary">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {insightLoading ? (
                <p className="text-sm text-muted-foreground">Loading insights…</p>
              ) : insight?.insight_text ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {insight.insight_text}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">
                  No patterns detected yet. Insights generate after your first 5
                  journal entries.
                </p>
              )}
              <button
                type="button"
                onClick={() => fetchLatest()}
                className="text-sm text-primary hover:underline underline-offset-4 mt-2"
              >
                Refresh insights
              </button>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Projects</h3>
            <Link
              to="/app/projects"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              View all projects
            </Link>
          </div>
          {recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((p) => {
                const projectEntries = entriesByProject.get(p.id) ?? [];
                const silenceGap = getLastEntryGap(projectEntries);
                const daysActive =
                  p.started_at != null
                    ? Math.floor(
                        (Date.now() - new Date(p.started_at).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ) + 1
                    : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/app/projects/${p.id}/checkin`}
                    className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {daysActive} days active
                          {silenceGap != null ? (
                            <>
                              {" · Last entry "}
                              {silenceGap === 0
                                ? "today"
                                : `${silenceGap} days ago`}
                              {silenceGap > 5 && (
                                <span className="text-destructive ml-1">
                                  · {silenceGap} days silent
                                </span>
                              )}
                            </>
                          ) : (
                            " · No entries yet"
                          )}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground capitalize">
                        {p.status ?? "active"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No projects. Create one to begin tracking.
              </p>
              <Button asChild>
                <Link to="/app/projects/new">Create project</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
