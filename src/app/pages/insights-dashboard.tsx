import * as React from "react";
import { Link } from "react-router";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useInsights } from "../../hooks/useInsights";
import type { ProjectPattern } from "../../hooks/useInsights";
import {
  getCommonBlockerWords,
  getBlockerFrequency,
} from "../../lib/blockerUtils";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCompletionRate,
  getAvoidancePatterns,
  type DailyTaskRow,
  type DailyTaskStatus,
} from "../../hooks/useDailyTasks";
import { supabase } from "../../lib/supabase";

function InsightsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

function PatternCard({
  pattern,
  dismissed,
  onNoted,
}: {
  pattern: ProjectPattern;
  dismissed: boolean;
  onNoted: () => void;
}) {
  if (dismissed) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold mb-1">{pattern.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
        {pattern.projectIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pattern.projectIds.map((pid) => (
              <Link
                key={pid}
                to={`/app/projects/${pid}`}
                className="text-sm text-primary hover:underline underline-offset-2"
              >
                {pattern.projectNames[pid] ?? pid}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onNoted} className="shrink-0">
        Noted
      </Button>
    </div>
  );
}

export function InsightsDashboard() {
  const { user } = useAuth();
  const {
    insights,
    projects,
    entries,
    patterns,
    growth,
    loading,
    error,
    fetchInsights,
    totalSilentDays,
    completionRate,
    abandonmentRate,
    avgEnergy,
    avgConfidence,
    completionRateByMonth,
  } = useInsights();
  const [dismissedPatternIds, setDismissedPatternIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [taskPatternsLoading, setTaskPatternsLoading] = React.useState(true);
  const [taskPatternsError, setTaskPatternsError] = React.useState<string | null>(
    null,
  );
  const [taskCompletionAllTime, setTaskCompletionAllTime] = React.useState(0);
  const [taskAvoidance, setTaskAvoidance] = React.useState<
    { label: string; skipped: number; total: number }[]
  >([]);
  const [bestDay, setBestDay] = React.useState<string | null>(null);
  const [skipDay, setSkipDay] = React.useState<string | null>(null);

  const handleNoted = (id: string) => {
    setDismissedPatternIds((prev) => new Set(prev).add(id));
  };

  const visiblePatterns = patterns.filter((p) => !dismissedPatternIds.has(p.id));
  const totalEntries = entries.length;
  const minEntriesForPatterns = 5;

  const commonBlockerWords = getCommonBlockerWords(entries);
  const projectBlockerRates = projects
    .map((p) => {
      const projectEntries = entries.filter((e) => e.project_id === p.id);
      const { percentage } = getBlockerFrequency(projectEntries);
      return { project: p, percentage };
    })
    .filter((x) => x.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  const timelineData = React.useMemo(() => {
    return projects
      .map((p) => {
        const start = new Date(p.started_at ?? p.created_at ?? 0).getTime();
        const end = p.ended_at
          ? new Date(p.ended_at).getTime()
          : Date.now();
        const durationDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        const status = p.status ?? "active";
        return {
          id: p.id,
          name: p.name,
          durationDays,
          status,
          startDate: p.started_at ?? p.created_at,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.startDate ?? 0).getTime() -
          new Date(b.startDate ?? 0).getTime(),
      );
  }, [projects]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "hsl(var(--chart-2))";
      case "abandoned":
        return "hsl(var(--destructive))";
      case "active":
        return "hsl(var(--primary))";
      case "paused":
        return "hsl(var(--muted-foreground))";
      default:
        return "hsl(var(--muted))";
    }
  };

  React.useEffect(() => {
    if (!user?.id) {
      setTaskPatternsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTaskPatternsLoading(true);
      setTaskPatternsError(null);
      try {
        const [completionAll, avoidance, dayStats] = await Promise.all([
          getCompletionRate(user.id, 365),
          getAvoidancePatterns(user.id),
          (async () => {
            const { data, error } = await supabase
              .from("daily_tasks")
              .select("planned_date, status")
              .eq("user_id", user.id);
            if (error || !data) {
              return { best: null as string | null, skip: null as string | null };
            }
            type Row = Pick<DailyTaskRow, "planned_date" | "status">;
            const rows = data as Row[];
            const byDay = new Map<
              number,
              { completed: number; total: number; skips: number }
            >();
            const validStatuses: DailyTaskStatus[] = [
              "planned",
              "in_progress",
              "completed",
              "skipped",
              "postponed",
            ];
            for (const t of rows) {
              const s = (t.status ?? "planned") as DailyTaskStatus;
              if (!validStatuses.includes(s)) continue;
              const d = new Date(t.planned_date);
              if (Number.isNaN(d.getTime())) continue;
              const weekday = d.getDay(); // 0-6
              const bucket =
                byDay.get(weekday) ?? { completed: 0, total: 0, skips: 0 };
              bucket.total += 1;
              if (s === "completed") bucket.completed += 1;
              if (s === "skipped" || s === "postponed") bucket.skips += 1;
              byDay.set(weekday, bucket);
            }
            if (byDay.size === 0) {
              return { best: null as string | null, skip: null as string | null };
            }
            const dayNames = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            let bestDayName: string | null = null;
            let bestRate = -1;
            let skipDayName: string | null = null;
            let skipCount = -1;
            for (const [dayIndex, stats] of byDay.entries()) {
              if (stats.total > 0) {
                const rate = stats.completed / stats.total;
                if (rate > bestRate) {
                  bestRate = rate;
                  bestDayName = dayNames[dayIndex];
                }
              }
              if (stats.skips > skipCount) {
                skipCount = stats.skips;
                skipDayName = dayNames[dayIndex];
              }
            }
            return { best: bestDayName, skip: skipDayName };
          })(),
        ]);
        if (cancelled) return;
        setTaskCompletionAllTime(completionAll);
        setTaskAvoidance(avoidance);
        setBestDay(dayStats.best);
        setSkipDay(dayStats.skip);
        setTaskPatternsLoading(false);
      } catch {
        if (cancelled) return;
        setTaskPatternsError("Failed to load task patterns.");
        setTaskPatternsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Patterns from your project history
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <InsightsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Insights</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Insights</h1>
              <p className="text-sm text-muted-foreground">
                Patterns from your project history
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Section 1 — Your Numbers */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Total projects started</div>
              <div className="text-2xl font-mono mt-1">{projects.length}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Completion rate</div>
              <div
                className={`text-2xl font-mono mt-1 ${
                  completionRate >= 50 ? "text-green-600 dark:text-green-400" : "text-destructive"
                }`}
              >
                {completionRate}%
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Abandonment rate</div>
              <div className="text-2xl font-mono mt-1">{abandonmentRate}%</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Journal entries logged</div>
              <div className="text-2xl font-mono mt-1">{totalEntries}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Avg energy score</div>
              <div className="text-2xl font-mono mt-1">{avgEnergy}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Avg confidence score</div>
              <div className="text-2xl font-mono mt-1">{avgConfidence}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Total silent days</div>
              <div className="text-2xl font-mono mt-1">{totalSilentDays}</div>
            </div>
          </div>
        </div>

        {/* Section 2 — Detected Patterns */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Detected Patterns</h2>
          {totalEntries < minEntriesForPatterns ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              Not enough data. Patterns require at least 5 entries across your projects.
            </div>
          ) : visiblePatterns.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              No patterns yet. Keep logging.
            </div>
          ) : (
            <div className="space-y-3">
              {commonBlockerWords.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold mb-1">Blocker words</h3>
                  <p className="text-sm text-muted-foreground">
                    Your most common blocker words across all projects:{" "}
                    {commonBlockerWords.join(", ")}
                  </p>
                </div>
              )}
              {projectBlockerRates.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold mb-1">Highest blocker rates</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Projects with highest blocker rates:{" "}
                    {projectBlockerRates.map(({ project }) => (
                      <Link
                        key={project.id}
                        to={`/app/projects/${project.id}`}
                        className="text-primary hover:underline mr-2"
                      >
                        {project.name}
                      </Link>
                    ))}
                  </p>
                </div>
              )}
              {patterns.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  dismissed={dismissedPatternIds.has(pattern.id)}
                  onNoted={() => handleNoted(pattern.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3 — AI Insights */}
        <div>
          <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
          {insights.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">
                No AI insights stored yet.
              </p>
              <button
                type="button"
                className="text-sm text-primary hover:underline underline-offset-2"
              >
                Refresh
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                AI analysis runs automatically after each post-mortem or every 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((row) => (
                <div
                  key={row.id}
                  className="bg-card border border-primary/30 rounded-lg p-6 border-l-4 border-l-primary"
                >
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
                    {row.insight_text ?? ""}
                  </p>
                  {row.generated_at && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.generated_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                AI analysis runs automatically after each post-mortem or every 7 days.
              </p>
            </div>
          )}
        </div>

        {/* Section 4 — Task Patterns */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Task Patterns</h2>
          {taskPatternsLoading ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <Skeleton className="h-16 rounded-md" />
            </div>
          ) : taskPatternsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {taskPatternsError}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Overall task completion rate
                  </div>
                  <div className="text-xl font-mono mt-1">
                    {taskCompletionAllTime}%
                  </div>
                </div>
                {bestDay && (
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Day with highest completion rate
                    </div>
                    <div className="text-sm mt-1">{bestDay}</div>
                  </div>
                )}
                {skipDay && (
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Day with most skips or postponements
                    </div>
                    <div className="text-sm mt-1">{skipDay}</div>
                  </div>
                )}
              </div>
              <p className="text-sm">
                You complete {taskCompletionAllTime}% of tasks you plan.
              </p>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Most frequently postponed or skipped task types
                </div>
                {taskAvoidance.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recurring postponement patterns yet.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2 text-xs">
                    {taskAvoidance.map((p) => (
                      <li
                        key={p.label}
                        className="px-2 py-1 rounded-full border border-border bg-card"
                        title={`Skipped ${p.skipped} times out of ${p.total}`}
                      >
                        {p.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 5 — Growth Tracker */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Growth Tracker</h2>
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            {growth === "insufficient_data" ? (
              <p className="text-muted-foreground">
                Complete at least 4 projects to see your growth trajectory.
              </p>
            ) : growth === "improving" ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <TrendingUp className="w-5 h-5" />
                <span>Completion rate is trending upward.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="w-5 h-5" />
                <span>
                  Completion rate is trending downward. Review your recent project
                  patterns.
                </span>
              </div>
            )}
            {completionRateByMonth.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Completion rate by month</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={completionRateByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, "Completion rate"]}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Section 5 — Project Timeline */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Project Timeline</h2>
          {timelineData.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              No projects to display.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 overflow-x-auto">
              <div className="space-y-2 min-w-[400px]">
                {timelineData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3"
                    title={`${item.name}: ${item.durationDays} days, ${item.status}`}
                  >
                    <div className="w-32 shrink-0 text-sm truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="flex-1 h-6 rounded overflow-hidden bg-muted/50">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${Math.min(100, (item.durationDays / 365) * 100)}%`,
                          backgroundColor: statusColor(item.status),
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {item.durationDays}d
                    </span>
                    <Link
                      to={`/app/projects/${item.id}`}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
