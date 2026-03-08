import * as React from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  PenLine,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useProjects,
  type ProjectRow,
  type ProjectStatus,
} from "../../hooks/useProjects";
import { useJournal } from "../../hooks/useJournal";
import { usePostMortem } from "../../hooks/usePostMortem";
import { PostMortemModal } from "../components/PostMortemModal";
import {
  getSilentDaysForProject,
  getLastEntryGap,
} from "../../lib/silenceUtils";
import { computeRiskScore } from "../../lib/riskScore";
import {
  getBlockerFrequency,
  getCommonBlockerWords,
  getBlockerTrend,
} from "../../lib/blockerUtils";
import { computeConsistencyScore } from "../../lib/consistencyScore";
import type { JournalEntryRow } from "../../hooks/useJournal";
import { useEmotionalArc } from "../../hooks/useEmotionalArc";
import { useDailyTasks, type DailyTaskStatus } from "../../hooks/useDailyTasks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

function SilenceHeatmap({
  entries,
  projectStartDate,
}: {
  entries: { created_at: string | null }[];
  projectStartDate: string;
}) {
  const start = new Date(projectStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysWithEntry = new Set<string>();
  for (const e of entries) {
    if (!e.created_at) continue;
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (d.getTime() >= start.getTime() && d.getTime() <= today.getTime()) {
      daysWithEntry.add(key);
    }
  }
  const cells: { date: Date; silent: boolean }[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= today.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ date: new Date(cursor), silent: !daysWithEntry.has(key) });
    cursor.setDate(cursor.getDate() + 1);
  }
  const slice = cells.slice(-84);
  const rows: { date: Date; silent: boolean }[][] = [];
  for (let i = 0; i < slice.length; i += 7) {
    rows.push(slice.slice(i, i + 7));
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 flex-wrap max-w-[280px]">
        {rows.flat().map((c, i) => (
          <div
            key={i}
            title={c.date.toLocaleDateString() + (c.silent ? " — no entry" : " — entry")}
            className={`w-3 h-3 rounded-sm ${
              c.silent ? "bg-muted" : "bg-primary/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, fetchProject, updateProjectStatus } = useProjects();
  const { entries, loading: entriesLoading } = useJournal(id);
  const userHistory = React.useMemo(
    () => ({
      total: projects.length,
      abandoned: projects.filter((p) => p.status === "abandoned").length,
    }),
    [projects],
  );
  const { postMortem, loading: pmLoading, getPostMortem } = usePostMortem(id);
  const [project, setProject] = React.useState<ProjectRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pendingStatus, setPendingStatus] = React.useState<ProjectStatus | null>(null);
  const [statusToConfirm, setStatusToConfirm] = React.useState<ProjectStatus | null>(null);
  const [pendingPostMortem, setPendingPostMortem] = React.useState(false);

  const { arcData: projectArc, loading: arcLoading } = useEmotionalArc(id);
  const {
    tasks: projectTasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasksForProject,
  } = useDailyTasks();

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProject(id).then((p) => {
      setProject(p ?? null);
      setLoading(false);
    });
  }, [id, fetchProject]);

  React.useEffect(() => {
    if (!id) return;
    fetchTasksForProject(id);
  }, [id, fetchTasksForProject]);

  React.useEffect(() => {
    if (!id) return;
    const key = `devmind:pending-postmortem:${id}`;
    if (postMortem) {
      localStorage.removeItem(key);
      setPendingPostMortem(false);
      return;
    }
    const flag = localStorage.getItem(key);
    setPendingPostMortem(flag === "true");
  }, [id, postMortem]);

  const openStatusDialog = (status: ProjectStatus) => {
    setStatusToConfirm(status);
  };

  const confirmStatusChange = async () => {
    if (!id || !statusToConfirm) return;
    const target = statusToConfirm;
    setPendingStatus(target);
    const ok = await updateProjectStatus(id, target);
    if (ok) {
      const key = `devmind:pending-postmortem:${id}`;
      localStorage.setItem(key, "true");
      navigate(`/app/projects/${id}/post-mortem`, {
        state: { targetStatus: target },
      });
    }
    setStatusToConfirm(null);
  };

  if (loading || !id) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
          <div className="h-64 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-muted-foreground">Project not found.</p>
          <Button variant="link" asChild>
            <Link to="/app/projects">Back to projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const startedAt = project.started_at ?? project.created_at ?? "";
  const daysActive = startedAt
    ? Math.floor(
        (Date.now() - new Date(startedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    : 0;
  const silentDays = getSilentDaysForProject(entries, startedAt || new Date().toISOString());
  const deadline = project.deadline_date;
  let deadlineLabel: string | null = null;
  if (deadline) {
    const d = new Date(deadline);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) deadlineLabel = `${diff} days remaining`;
    else if (diff < 0) deadlineLabel = `${Math.abs(diff)} days overdue`;
    else deadlineLabel = "Due today";
  }
  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <AlertDialog
        open={statusToConfirm != null}
        onOpenChange={(open) => !open && setStatusToConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToConfirm
                ? `Mark this project as ${statusToConfirm}?`
                : "Update status"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger a post-mortem review. Status is only final
              after the post-mortem is completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/app/projects">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h1 className="text-xl font-semibold truncate">{project.name}</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Update status
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openStatusDialog("completed")}
                >
                  Mark as completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openStatusDialog("paused")}
                >
                  Pause project
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => openStatusDialog("abandoned")}
                >
                  Abandon project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            {project.type ?? "Project"} · {daysActive} days active
            {deadlineLabel && (
              <span className={deadlineLabel.includes("overdue") ? "text-destructive ml-2" : " ml-2"}>
                · {deadlineLabel}
              </span>
            )}
          </p>
          {pendingPostMortem && (
            <div className="mt-3 ml-11 text-xs text-amber-400">
              This project has a pending post-mortem. Complete it to finalise
              the status change.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="postmortem">Post-mortem</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {project.abandonment_risk && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm text-amber-800 dark:text-amber-200">
                    Risk factor
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {project.abandonment_risk}
                  </p>
                </div>
              </div>
            )}
            {project.status === "active" && (() => {
              const risk = computeRiskScore(project, entries, userHistory);
              return (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="font-semibold mb-1">
                    Abandonment Risk: {risk.label}
                  </div>
                  {risk.factors.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {risk.factors.join(". ")}
                    </p>
                  )}
                </div>
              );
            })()}
            {(() => {
              const consistency = computeConsistencyScore(
                entries,
                startedAt || new Date().toISOString(),
              );
              const blocker = getBlockerFrequency(entries);
              const blockerWords = getCommonBlockerWords(entries);
              const blockerTrend = getBlockerTrend(entries);
              return (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <span className="font-medium text-sm">Consistency: </span>
                    <span className="text-muted-foreground text-sm">
                      {consistency.score}% ({consistency.label})
                    </span>
                  </div>
                  {entries.length > 0 && (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Blocked on {blocker.percentage}% of sessions.
                      </div>
                      {blockerWords.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Most common blocker themes: {blockerWords.join(", ")}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Blocker trend: {blockerTrend.charAt(0).toUpperCase() + blockerTrend.slice(1)}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            {projectArc.length >= 3 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-base font-semibold mb-4">
                  Energy and confidence
                </h3>
                {arcLoading ? (
                  <div className="h-52 rounded-lg bg-muted/50 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={projectArc}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[1, 10]}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Energy"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      name="Confidence"
                      dot={false}
                    />
                  </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Silence heatmap
              </h3>
              <SilenceHeatmap entries={entries} projectStartDate={startedAt} />
              <p className="text-sm text-muted-foreground mt-3">
                {silentDays} recorded silent days on this project
              </p>
            </div>
          </TabsContent>

          <TabsContent value="journal" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Tasks linked to this project
                </h3>
                {(() => {
                  const counts = { total: 0, completed: 0 };
                  for (const t of projectTasks) {
                    const s = (t.status ?? "planned") as DailyTaskStatus;
                    if (
                      ["planned", "in_progress", "completed", "skipped", "postponed"].includes(
                        s,
                      )
                    ) {
                      counts.total += 1;
                      if (s === "completed") counts.completed += 1;
                    }
                  }
                  const rate =
                    counts.total === 0
                      ? 0
                      : Math.round((counts.completed / counts.total) * 100);
                  return (
                    <span className="text-xs text-muted-foreground">
                      Completion rate: {rate}%
                    </span>
                  );
                })()}
              </div>
              {tasksLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-8 rounded-md bg-muted/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : tasksError ? (
                <p className="text-xs text-destructive">
                  Failed to load tasks.
                </p>
              ) : projectTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tasks linked to this project.
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {projectTasks.slice(0, 6).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-muted-foreground capitalize">
                        {t.status ?? "planned"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end">
              <Button size="sm" asChild>
                <Link to={`/app/projects/${id}/checkin`}>
                  <PenLine className="w-4 h-4 mr-2" />
                  Log entry
                </Link>
              </Button>
            </div>
            {entriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                No entries yet. Log your first check-in.
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((e: JournalEntryRow) => (
                  <div
                    key={e.id}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-muted-foreground">
                        {e.created_at
                          ? new Date(e.created_at).toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })
                          : "—"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">
                        {e.entry_mode ?? "quick"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <span>Energy: {e.energy_score ?? "—"}</span>
                      <span>Confidence: {e.confidence_score ?? "—"}</span>
                      {e.mood_word && (
                        <span className="text-muted-foreground">
                          Mood: {e.mood_word}
                        </span>
                      )}
                      {e.was_blocked && e.blocker_note && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Blocker: {e.blocker_note}
                        </span>
                      )}
                    </div>
                    {e.reflection && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {e.reflection}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="postmortem" className="space-y-4">
            {project.status === "active" ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                Post-mortem available when project ends.
              </div>
            ) : pmLoading ? (
              <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
            ) : postMortem ? (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Post-mortem</h3>
                  <dl className="grid gap-2 text-sm">
                    {postMortem.was_rushed && (
                      <><dt className="text-muted-foreground">Rushed</dt><dd>{postMortem.was_rushed}</dd></>
                    )}
                    {postMortem.was_overwhelmed && (
                      <><dt className="text-muted-foreground">Overwhelmed</dt><dd>{postMortem.was_overwhelmed}</dd></>
                    )}
                    {postMortem.satisfaction_score != null && (
                      <><dt className="text-muted-foreground">Satisfaction</dt><dd>{postMortem.satisfaction_score}/5</dd></>
                    )}
                    {postMortem.closing_note && (
                      <><dt className="text-muted-foreground">Closing note</dt><dd>{postMortem.closing_note}</dd></>
                    )}
                  </dl>
                </div>
                <div className="bg-card border border-border rounded-lg p-6 border-l-4 border-l-primary">
                  <h3 className="font-semibold mb-2">Pattern summary</h3>
                  {postMortem.ai_summary ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {postMortem.ai_summary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pattern summary generating. Check insights shortly.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Complete a post-mortem to capture what you learned.
                </p>
                <Button asChild>
                  <Link to={`/app/projects/${id}/post-mortem`}>
                    Open post-mortem
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
