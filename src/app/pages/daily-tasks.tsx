import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { useProjects } from "../../hooks/useProjects";
import {
  useDailyTasks,
  type DailyTaskRow,
  type DailyTaskStatus,
} from "../../hooks/useDailyTasks";
import {
  scheduleTaskNotification,
  cancelTaskNotification,
} from "../../lib/taskNotifications";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function addDays(base: string, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0]!;
}

function isBeforeToday(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function isAfterToday(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

export function DailyTasksPage() {
  const todayStr = new Date().toISOString().split("T")[0]!;
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const { projects } = useProjects();
  const {
    tasks,
    loading,
    error,
    fetchTasksForDate,
    createTask,
    updateTaskStatus,
    updateActualTime,
  } = useDailyTasks();

  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string | "standalone">(
    "standalone",
  );
  const [newStartTime, setNewStartTime] = useState("");
  const [newDuration, setNewDuration] = useState<number | "">("");
  const [notify, setNotify] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState<number>(15);

  const [skipEditor, setSkipEditor] = useState<{
    taskId: string | null;
    value: string;
  }>({ taskId: null, value: "" });
  const [completeEditor, setCompleteEditor] = useState<{
    taskId: string | null;
    value: string;
  }>({ taskId: null, value: "" });

  const [journalPrompt, setJournalPrompt] = useState<{
    show: boolean;
    projectId?: string;
    projectName?: string;
  }>({ show: false });

  const timeoutsRef = useRef<number[]>([]);

  const isToday = currentDate === todayStr;
  const maxFutureStr = addDays(todayStr, 7);
  const canGoForward = currentDate < maxFutureStr;

  useEffect(() => {
    fetchTasksForDate(currentDate);
  }, [currentDate, fetchTasksForDate]);

  useEffect(() => {
    if (!journalPrompt.show || !journalPrompt.projectId) return;
    const key = `journal_prompted_${currentDate}_${journalPrompt.projectId}`;
    const alreadyDismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(key) === "true";
    if (alreadyDismissed) {
      setJournalPrompt({ show: false });
    }
  }, [currentDate, journalPrompt.projectId, journalPrompt.show]);

  useEffect(() => {
    // clear existing
    timeoutsRef.current.forEach((id) => cancelTaskNotification(id));
    timeoutsRef.current = [];

    if (!isToday) return;

    for (const t of tasks) {
      if (
        !t.notify_at_start ||
        !t.planned_start_time ||
        t.planned_date !== todayStr
      ) {
        continue;
      }
      const timeoutId = scheduleTaskNotification({
        id: t.id,
        title: t.title,
        planned_date: t.planned_date,
        planned_start_time: t.planned_start_time,
        notify_before_minutes: t.notify_before_minutes ?? 15,
      });
      if (typeof timeoutId === "number") {
        timeoutsRef.current.push(timeoutId);
      }
    }

    return () => {
      timeoutsRef.current.forEach((id) => cancelTaskNotification(id));
      timeoutsRef.current = [];
    };
  }, [tasks, isToday, todayStr]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      map.set(p.id, p.name);
    }
    return map;
  }, [projects]);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    if (isBeforeToday(currentDate)) return;
    await createTask({
      title: newTitle.trim(),
      project_id:
        newProjectId === "standalone" ? null : (newProjectId as string),
      planned_date: currentDate,
      planned_start_time: newStartTime || null,
      planned_duration_minutes:
        typeof newDuration === "number" ? newDuration : null,
      notify_at_start: notify,
      notify_before_minutes: notify ? notifyBefore : null,
    });
    setNewTitle("");
    setNewStartTime("");
    setNewDuration("");
    setNotify(false);
    setNotifyBefore(15);
  };

  const handleStart = async (task: DailyTaskRow) => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    await updateActualTime(task.id, timeStr, 0);
    await updateTaskStatus(task.id, "in_progress");
  };

  const handleComplete = async (task: DailyTaskRow, note?: string) => {
    const now = new Date();
    const start = task.actual_start_time
      ? new Date(`${task.planned_date}T${task.actual_start_time}`)
      : now;
    const diffMinutes = Math.max(
      1,
      Math.round((now.getTime() - start.getTime()) / 60000),
    );
    await updateActualTime(
      task.id,
      task.actual_start_time ?? now.toTimeString().slice(0, 8),
      diffMinutes,
    );
    await updateTaskStatus(task.id, "completed", note);

    if (task.project_id) {
      const remainingTasks = tasks.filter((t) => {
        const status = (t.status ?? "planned") as DailyTaskStatus;
        return (
          t.project_id === task.project_id &&
          t.id !== task.id &&
          t.planned_date === task.planned_date &&
          !["completed", "skipped"].includes(status)
        );
      });

      const key = `journal_prompted_${task.planned_date}_${task.project_id}`;
      const alreadyPrompted =
        typeof window !== "undefined" &&
        window.localStorage.getItem(key) === "true";

      if (remainingTasks.length === 0 && !alreadyPrompted) {
        const projectName =
          (task.project_id && projectNameById.get(task.project_id)) ?? "";
        setJournalPrompt({
          show: true,
          projectId: task.project_id ?? undefined,
          projectName,
        });
      }
    }
  };

  const handleReschedule = async (task: DailyTaskRow) => {
    const tomorrow = addDays(task.planned_date, 1);
    await createTask({
      title: task.title,
      description: task.description,
      project_id: task.project_id,
      planned_date: tomorrow,
      planned_start_time: task.planned_start_time,
      planned_duration_minutes: task.planned_duration_minutes,
      notify_at_start: task.notify_at_start ?? false,
      notify_before_minutes: task.notify_before_minutes ?? 15,
    });
  };

  const counts = useMemo(() => {
    const base = {
      planned: 0,
      in_progress: 0,
      completed: 0,
      skipped: 0,
      postponed: 0,
    };
    for (const t of tasks) {
      const s = (t.status ?? "planned") as DailyTaskStatus;
      if (s in base) {
        // @ts-expect-error narrow
        base[s] += 1;
      }
    }
    return base;
  }, [tasks]);

  const totalPlanned =
    counts.planned +
    counts.in_progress +
    counts.completed +
    counts.skipped +
    counts.postponed;
  const completionRate =
    totalPlanned === 0
      ? 0
      : Math.round((counts.completed / totalPlanned) * 100);

  const readOnly = isBeforeToday(currentDate);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
          <h1 className="text-2xl font-semibold">Daily tasks</h1>
          <p className="text-sm text-muted-foreground">
            Track what you said you would do versus what you actually did.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          ← Back to Dashboard
        </button>

        {/* Top section — date navigation */}
        <section className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Yesterday
            </Button>
            <div className="px-3 py-1.5 rounded-full border border-border text-sm font-mono">
              {isToday ? "Today" : formatDateLabel(currentDate)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              disabled={!canGoForward}
            >
              Tomorrow
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Can plan up to 7 days ahead. Past days are read-only.
          </div>
        </section>

        {/* Task input */}
        {!readOnly && (
          <section className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="task-title">Task title</Label>
                <Input
                  id="task-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What are you actually going to do?"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Linked project (optional)</Label>
                <select
                  value={newProjectId}
                  onChange={(e) =>
                    setNewProjectId(e.target.value as string | "standalone")
                  }
                  className="bg-background border border-input rounded-md h-9 px-2 text-sm"
                >
                  <option value="standalone">No project / standalone</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Planned start</Label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="bg-background w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Planned duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newDuration}
                  onChange={(e) =>
                    setNewDuration(
                      e.target.value === ""
                        ? ""
                        : Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  className="bg-background w-28"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <Switch
                  checked={notify}
                  onCheckedChange={(checked) => setNotify(checked)}
                />
                <span className="text-sm">Notify me before start</span>
              </div>
              {notify && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Notify
                  </span>
                  {[5, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNotifyBefore(m)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        notifyBefore === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border"
                      }`}
                    >
                      {m === 60 ? "1 hr" : `${m} min`}
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    value={notifyBefore}
                    onChange={(e) =>
                      setNotifyBefore(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    className="w-20 h-8 bg-background text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    minutes before
                  </span>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                className="md:self-end"
                onClick={handleAddTask}
              >
                Add task
              </Button>
            </div>
          </section>
        )}

        {/* Task list */}
        <section className="space-y-4">
          {journalPrompt.show && journalPrompt.projectId && (
            <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-lg p-4 space-y-3">
              <p className="text-sm">
                All tasks for{" "}
                <strong>{journalPrompt.projectName ?? "this project"}</strong>
                {" "}are done for today. Log a check-in on this project.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const key = `journal_prompted_${currentDate}_${journalPrompt.projectId}`;
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(key, "true");
                    }
                    navigate(
                      `/app/projects/${journalPrompt.projectId}/checkin`,
                    );
                  }}
                  className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted"
                >
                  Log check-in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (journalPrompt.projectId) {
                      const key = `journal_prompted_${currentDate}_${journalPrompt.projectId}`;
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(key, "true");
                      }
                    }
                    setJournalPrompt({ show: false });
                  }}
                  className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted"
                >
                  Not now
                </button>
              </div>
            </div>
          )}
          <h2 className="text-base font-semibold">
            Tasks for {formatDateLabel(currentDate)}
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks recorded for this day.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const status = (task.status ?? "planned") as DailyTaskStatus;
                const projectName = task.project_id
                  ? projectNameById.get(task.project_id) ?? "linked"
                  : "standalone";
                const plannedLabel =
                  task.planned_start_time || task.planned_duration_minutes
                    ? `Planned: ${
                        task.planned_start_time
                          ? task.planned_start_time.slice(0, 5)
                          : "--:--"
                      }${
                        task.planned_duration_minutes
                          ? ` — ${task.planned_duration_minutes} min`
                          : ""
                      }`
                    : null;
                const actual =
                  task.actual_duration_minutes && task.actual_duration_minutes > 0
                    ? task.actual_duration_minutes
                    : null;
                const plannedDuration = task.planned_duration_minutes ?? null;
                const overrun =
                  actual != null &&
                  plannedDuration != null &&
                  actual > plannedDuration * 1.5;

                return (
                  <div
                    key={task.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {task.title}
                          </span>
                          <Badge
                            variant={
                              projectName === "standalone"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {projectName}
                          </Badge>
                        </div>
                        {plannedLabel && (
                          <div className="text-xs text-muted-foreground">
                            {plannedLabel}
                          </div>
                        )}
                        {status === "completed" && actual != null && (
                          <div className="text-xs text-muted-foreground">
                            Actual: {actual} min
                            {plannedDuration != null && (
                              <>
                                {" "}
                                (planned {plannedDuration} min)
                              </>
                            )}
                            {overrun && (
                              <span className="text-amber-400 ml-1">
                                Took longer than planned
                              </span>
                            )}
                          </div>
                        )}
                        {(status === "skipped" || status === "postponed") &&
                          task.skip_reason && (
                            <div className="text-xs text-muted-foreground">
                              Reason: {task.skip_reason}
                            </div>
                          )}
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {status === "planned" && !readOnly && (
                        <>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleStart(task)}
                          >
                            Start
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              setSkipEditor({
                                taskId: task.id,
                                value: "",
                              })
                            }
                          >
                            Skip
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              updateTaskStatus(task.id, "postponed")
                            }
                          >
                            Postpone
                          </Button>
                        </>
                      )}
                      {status === "in_progress" && !readOnly && (
                        <>
                          <Button
                            size="xs"
                            onClick={() =>
                              setCompleteEditor({
                                taskId: task.id,
                                value: "",
                              })
                            }
                          >
                            Complete
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              updateTaskStatus(task.id, "planned")
                            }
                          >
                            Pause
                          </Button>
                        </>
                      )}
                      {(status === "skipped" || status === "postponed") &&
                        !readOnly && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleReschedule(task)}
                          >
                            Reschedule
                          </Button>
                        )}
                    </div>

                    {/* Skip editor */}
                    {skipEditor.taskId === task.id && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs">
                          Why are you skipping this? (optional)
                        </Label>
                        <Input
                          value={skipEditor.value}
                          onChange={(e) =>
                            setSkipEditor({
                              ...skipEditor,
                              value: e.target.value,
                            })
                          }
                          className="bg-background text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            onClick={async () => {
                              await updateTaskStatus(
                                task.id,
                                "skipped",
                                skipEditor.value,
                              );
                              setSkipEditor({
                                taskId: null,
                                value: "",
                              });
                            }}
                          >
                            Confirm skip
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              setSkipEditor({
                                taskId: null,
                                value: "",
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Complete editor */}
                    {completeEditor.taskId === task.id && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs">
                          Any notes on this task? (optional)
                        </Label>
                        <Input
                          value={completeEditor.value}
                          onChange={(e) =>
                            setCompleteEditor({
                              ...completeEditor,
                              value: e.target.value,
                            })
                          }
                          className="bg-background text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            onClick={async () => {
                              await handleComplete(
                                task,
                                completeEditor.value,
                              );
                              setCompleteEditor({
                                taskId: null,
                                value: "",
                              });
                            }}
                          >
                            Confirm complete
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              setCompleteEditor({
                                taskId: null,
                                value: "",
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h2 className="text-base font-semibold mb-2">
            Summary for {formatDateLabel(currentDate)}
          </h2>
          <div className="flex flex-wrap gap-3 text-xs">
            <SummaryItem label="Planned" value={counts.planned} />
            <SummaryItem label="In progress" value={counts.in_progress} />
            <SummaryItem label="Completed" value={counts.completed} />
            <SummaryItem label="Skipped" value={counts.skipped} />
            <SummaryItem label="Postponed" value={counts.postponed} />
            <SummaryItem label="Completion rate" value={`${completionRate}%`} />
          </div>
          {completionRate < 50 && totalPlanned > 0 && (
            <p className="text-xs text-destructive mt-2">
              Less than half of today's tasks completed.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DailyTaskStatus }) {
  const map: Record<
    DailyTaskStatus,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    planned: { label: "planned", variant: "secondary" },
    in_progress: { label: "in progress", variant: "default" },
    completed: { label: "completed", variant: "default" },
    skipped: { label: "skipped", variant: "destructive" },
    postponed: { label: "postponed", variant: "secondary" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant}>
      {status === "completed" && <Check className="w-3 h-3 mr-1" />}
      {cfg.label}
    </Badge>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <span className="font-medium text-[11px]">{label}:</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

