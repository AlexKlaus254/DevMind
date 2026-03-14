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
  type RecurringTaskRow,
} from "../../hooks/useDailyTasks";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
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
    recurringTasks,
    recurringLoading,
    recurringError,
    fetchRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    generateRecurringTasksForDate,
    createTask,
    updateTaskStatus,
    updateActualTime,
    breakDay,
    breakDayLoading,
    breakDayError,
    fetchBreakDay,
    setBreakDay,
    removeBreakDay,
    planRecord,
    planRecordLoading,
    planRecordError,
    fetchPlanRecord,
    upsertPlanRecord,
    checkAndRecordYesterday,
  } = useDailyTasks();
  const { settings } = useNotificationSettings();

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

  const [showRecurringTemplates, setShowRecurringTemplates] = useState(false);
  const [newRecurringTitle, setNewRecurringTitle] = useState("");
  const [newRecurringProjectId, setNewRecurringProjectId] = useState<
    string | "standalone"
  >("standalone");
  const [newRecurringFrequency, setNewRecurringFrequency] = useState<
    "daily" | "weekdays" | "weekends" | "custom"
  >("weekdays");
  const [newRecurringCustomDays, setNewRecurringCustomDays] = useState<string[]>(
    [],
  );
  const [newRecurringStartTime, setNewRecurringStartTime] = useState("");
  const [newRecurringDuration, setNewRecurringDuration] = useState<number | "">(
    "",
  );
  const [newRecurringNotify, setNewRecurringNotify] = useState(false);
  const [newRecurringNotifyBefore, setNewRecurringNotifyBefore] =
    useState<number>(15);

  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(
    null,
  );
  const [editingRecurringState, setEditingRecurringState] = useState<{
    title: string;
    projectId: string | "standalone";
    frequency: "daily" | "weekdays" | "weekends" | "custom";
    customDays: string[];
    startTime: string;
    duration: number | "";
    notify: boolean;
    notifyBefore: number;
    isActive: boolean;
  } | null>(null);

  const timeoutsRef = useRef<number[]>([]);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [breakType, setBreakType] = useState<string>("Rest");
  const [breakNote, setBreakNote] = useState<string>("");
  const [planBannerVisible, setPlanBannerVisible] = useState(false);

  const isToday = currentDate === todayStr;
  const maxFutureStr = addDays(todayStr, 7);
  const canGoForward = currentDate < maxFutureStr;

  useEffect(() => {
    fetchRecurringTasks();
  }, [fetchRecurringTasks]);

  useEffect(() => {
    checkAndRecordYesterday();
  }, [checkAndRecordYesterday]);

  useEffect(() => {
    fetchBreakDay(currentDate);
    fetchPlanRecord(currentDate);
  }, [currentDate, fetchBreakDay, fetchPlanRecord]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (currentDate === todayStr) {
        await generateRecurringTasksForDate(currentDate);
      }
      if (!cancelled) {
        await fetchTasksForDate(currentDate);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentDate, fetchTasksForDate, generateRecurringTasksForDate, todayStr]);

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
    const created = await createTask({
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
    if (created && currentDate === todayStr) {
      const now = new Date();
      const timeStr = now.toISOString();
      const existingCount = planRecord?.task_count ?? 0;
      await upsertPlanRecord({
        date: todayStr,
        planned_at: planRecord?.planned_at ?? timeStr,
        task_count: existingCount + 1,
        is_break_day: false,
        plan_filled: true,
      });
      setPlanBannerVisible(false);
    }
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

  const dayNameOptions: { value: string; label: string }[] = [
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
  ];

  const toggleNewRecurringDay = (day: string) => {
    setNewRecurringCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleEditingRecurringDay = (day: string) => {
    if (!editingRecurringState) return;
    setEditingRecurringState({
      ...editingRecurringState,
      customDays: editingRecurringState.customDays.includes(day)
        ? editingRecurringState.customDays.filter((d) => d !== day)
        : [...editingRecurringState.customDays, day],
    });
  };

  const handleAddRecurringTemplate = async () => {
    if (!newRecurringTitle.trim()) return;
    await createRecurringTask({
      title: newRecurringTitle.trim(),
      project_id:
        newRecurringProjectId === "standalone"
          ? null
          : (newRecurringProjectId as string),
      description: null,
      frequency: newRecurringFrequency,
      custom_days:
        newRecurringFrequency === "custom" ? newRecurringCustomDays : [],
      planned_start_time: newRecurringStartTime || null,
      planned_duration_minutes:
        typeof newRecurringDuration === "number" ? newRecurringDuration : null,
      notify_at_start: newRecurringNotify,
      notify_before_minutes: newRecurringNotify ? newRecurringNotifyBefore : 15,
      is_active: true,
    });
    setNewRecurringTitle("");
    setNewRecurringProjectId("standalone");
    setNewRecurringFrequency("weekdays");
    setNewRecurringCustomDays([]);
    setNewRecurringStartTime("");
    setNewRecurringDuration("");
    setNewRecurringNotify(false);
    setNewRecurringNotifyBefore(15);
  };

  const startEditingRecurring = (tmpl: RecurringTaskRow) => {
    setEditingRecurringId(tmpl.id);
    setEditingRecurringState({
      title: tmpl.title,
      projectId: tmpl.project_id ?? "standalone",
      frequency: (tmpl.frequency as
        | "daily"
        | "weekdays"
        | "weekends"
        | "custom") ?? "weekdays",
      customDays: tmpl.custom_days ?? [],
      startTime: tmpl.planned_start_time ?? "",
      duration: tmpl.planned_duration_minutes ?? "",
      notify: tmpl.notify_at_start ?? false,
      notifyBefore: tmpl.notify_before_minutes ?? 15,
      isActive: tmpl.is_active ?? true,
    });
  };

  const handleSaveRecurringEdit = async () => {
    if (!editingRecurringId || !editingRecurringState) return;
    await updateRecurringTask(editingRecurringId, {
      title: editingRecurringState.title.trim(),
      project_id:
        editingRecurringState.projectId === "standalone"
          ? null
          : (editingRecurringState.projectId as string),
      frequency: editingRecurringState.frequency,
      custom_days:
        editingRecurringState.frequency === "custom"
          ? editingRecurringState.customDays
          : [],
      planned_start_time: editingRecurringState.startTime || null,
      planned_duration_minutes:
        typeof editingRecurringState.duration === "number"
          ? editingRecurringState.duration
          : null,
      notify_at_start: editingRecurringState.notify,
      notify_before_minutes: editingRecurringState.notify
        ? editingRecurringState.notifyBefore
        : 15,
      is_active: editingRecurringState.isActive,
    });
    setEditingRecurringId(null);
    setEditingRecurringState(null);
  };

  useEffect(() => {
    if (!isToday) {
      setPlanBannerVisible(false);
      return;
    }
    if (!settings || planRecordLoading) return;
    const enabled = settings.plan_reminder_enabled ?? true;
    if (!enabled) {
      setPlanBannerVisible(false);
      return;
    }
    const rawTime =
      settings.plan_reminder_time ??
      settings.plan_reminder_custom_time ??
      "08:00";
    const [hStr] = rawTime.split(":");
    const h = Number(hStr ?? "0");
    const nowHour = new Date().getHours();
    const timeGate = nowHour >= h;
    const filled = planRecord?.plan_filled ?? false;
    setPlanBannerVisible(timeGate && !filled);
  }, [isToday, planRecord, planRecordLoading, settings]);

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
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
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
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">
                Can plan up to 7 days ahead. Past days are read-only.
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBreakForm((v) => !v)}
                  disabled={breakDayLoading}
                >
                  {breakDay ? "Edit break day" : "Mark as break day"}
                </Button>
              )}
            </div>
          </div>
          {showBreakForm && !readOnly && (
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Break type</Label>
                  <select
                    value={breakType}
                    onChange={(e) => setBreakType(e.target.value)}
                    className="bg-background border border-input rounded-md h-8 px-2 text-xs"
                  >
                    <option value="Rest">Rest</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Sick">Sick</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Note</Label>
                  <Input
                    value={breakNote}
                    onChange={(e) => setBreakNote(e.target.value)}
                    placeholder="Optional note"
                    className="bg-background h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await setBreakDay(currentDate, breakType, breakNote || null);
                      setShowBreakForm(false);
                    }}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowBreakForm(false);
                      setBreakNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
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

        {/* Recurring task templates */}
        {!readOnly && (
          <section className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Recurring templates</h2>
                <p className="text-xs text-muted-foreground">
                  Define tasks that should appear automatically on matching days.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRecurringTemplates((v) => !v)}
              >
                {showRecurringTemplates ? "Hide" : "Show"}
              </Button>
            </div>

            {showRecurringTemplates && (
              <div className="space-y-4">
                {recurringError && (
                  <p className="text-xs text-destructive">{recurringError}</p>
                )}

                {/* Add template form */}
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Add new template
                  </p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={newRecurringTitle}
                        onChange={(e) => setNewRecurringTitle(e.target.value)}
                        placeholder="Example: Morning planning pass"
                        className="bg-background h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Project (optional)</Label>
                      <select
                        value={newRecurringProjectId}
                        onChange={(e) =>
                          setNewRecurringProjectId(
                            e.target.value as string | "standalone",
                          )
                        }
                        className="bg-background border border-input rounded-md h-8 px-2 text-xs"
                      >
                        <option value="standalone">No project / standalone</option>
                        {activeProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Frequency</Label>
                      <select
                        value={newRecurringFrequency}
                        onChange={(e) =>
                          setNewRecurringFrequency(
                            e.target.value as
                              | "daily"
                              | "weekdays"
                              | "weekends"
                              | "custom",
                          )
                        }
                        className="bg-background border border-input rounded-md h-8 px-2 text-xs"
                      >
                        <option value="daily">Every day</option>
                        <option value="weekdays">Weekdays (Mon–Fri)</option>
                        <option value="weekends">Weekends (Sat–Sun)</option>
                        <option value="custom">Custom days</option>
                      </select>
                    </div>

                    {newRecurringFrequency === "custom" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Days</Label>
                        <div className="flex flex-wrap gap-1">
                          {dayNameOptions.map((d) => {
                            const active = newRecurringCustomDays.includes(d.value);
                            return (
                              <button
                                key={d.value}
                                type="button"
                                onClick={() => toggleNewRecurringDay(d.value)}
                                className={`px-2 py-1 rounded-full text-[11px] border ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">Start time</Label>
                      <Input
                        type="time"
                        value={newRecurringStartTime}
                        onChange={(e) => setNewRecurringStartTime(e.target.value)}
                        className="bg-background h-8 text-xs w-28"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Duration (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newRecurringDuration}
                        onChange={(e) =>
                          setNewRecurringDuration(
                            e.target.value === ""
                              ? ""
                              : Math.max(1, Number(e.target.value) || 1),
                          )
                        }
                        className="bg-background h-8 text-xs w-24"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={newRecurringNotify}
                        onCheckedChange={(checked) =>
                          setNewRecurringNotify(checked)
                        }
                      />
                      <span className="text-xs">Notify me before start</span>
                    </div>
                    {newRecurringNotify && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          Notify
                        </span>
                        {[5, 15, 30, 60].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setNewRecurringNotifyBefore(m)}
                            className={`px-2 py-1 rounded-full text-[11px] border ${
                              newRecurringNotifyBefore === m
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
                          value={newRecurringNotifyBefore}
                          onChange={(e) =>
                            setNewRecurringNotifyBefore(
                              Math.max(1, Number(e.target.value) || 1),
                            )
                          }
                          className="w-20 h-8 bg-background text-xs"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          minutes before
                        </span>
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="md:self-end"
                      onClick={handleAddRecurringTemplate}
                      disabled={!newRecurringTitle.trim() || recurringLoading}
                    >
                      Add template
                    </Button>
                  </div>
                </div>

                {/* Existing templates */}
                <div className="space-y-2">
                  {recurringLoading && (
                    <p className="text-xs text-muted-foreground">
                      Loading templates...
                    </p>
                  )}
                  {!recurringLoading && recurringTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No recurring templates yet. Start with one or two that really
                      matter.
                    </p>
                  )}
                  {recurringTasks.length > 0 && (
                    <div className="space-y-2">
                      {recurringTasks.map((tmpl) => {
                        const isEditing = editingRecurringId === tmpl.id;
                        const freqLabel =
                          (tmpl.frequency ?? "daily") === "daily"
                            ? "Every day"
                            : tmpl.frequency === "weekdays"
                              ? "Weekdays"
                              : tmpl.frequency === "weekends"
                                ? "Weekends"
                                : "Custom days";
                        const projectName = tmpl.project_id
                          ? projectNameById.get(tmpl.project_id) ?? "linked"
                          : "standalone";
                        return (
                          <div
                            key={tmpl.id}
                            className="border border-border rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {tmpl.title}
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
                                  {tmpl.is_active === false && (
                                    <span className="text-[11px] text-muted-foreground">
                                      Paused
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {freqLabel}
                                  {tmpl.frequency === "custom" &&
                                    tmpl.custom_days &&
                                    tmpl.custom_days.length > 0 && (
                                      <>
                                        {" "}
                                        ·{" "}
                                        {tmpl.custom_days
                                          .map((d) => d.slice(0, 3))
                                          .join(", ")}
                                      </>
                                    )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => startEditingRecurring(tmpl)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() =>
                                    updateRecurringTask(tmpl.id, {
                                      is_active: !(tmpl.is_active ?? true),
                                    })
                                  }
                                >
                                  {tmpl.is_active === false ? "Activate" : "Pause"}
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => deleteRecurringTask(tmpl.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>

                            {isEditing && editingRecurringState && (
                              <div className="mt-3 space-y-3 border-t border-border pt-3">
                                <div className="flex flex-col md:flex-row gap-3">
                                  <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Title</Label>
                                    <Input
                                      value={editingRecurringState.title}
                                      onChange={(e) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          title: e.target.value,
                                        })
                                      }
                                      className="bg-background h-8 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Project (optional)
                                    </Label>
                                    <select
                                      value={editingRecurringState.projectId}
                                      onChange={(e) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          projectId: e.target.value as
                                            | string
                                            | "standalone",
                                        })
                                      }
                                      className="bg-background border border-input rounded-md h-8 px-2 text-xs"
                                    >
                                      <option value="standalone">
                                        No project / standalone
                                      </option>
                                      {activeProjects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3 items-end">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Frequency</Label>
                                    <select
                                      value={editingRecurringState.frequency}
                                      onChange={(e) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          frequency: e.target.value as
                                            | "daily"
                                            | "weekdays"
                                            | "weekends"
                                            | "custom",
                                        })
                                      }
                                      className="bg-background border border-input rounded-md h-8 px-2 text-xs"
                                    >
                                      <option value="daily">Every day</option>
                                      <option value="weekdays">
                                        Weekdays (Mon–Fri)
                                      </option>
                                      <option value="weekends">
                                        Weekends (Sat–Sun)
                                      </option>
                                      <option value="custom">Custom days</option>
                                    </select>
                                  </div>

                                  {editingRecurringState.frequency === "custom" && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Days</Label>
                                      <div className="flex flex-wrap gap-1">
                                        {dayNameOptions.map((d) => {
                                          const active =
                                            editingRecurringState.customDays.includes(
                                              d.value,
                                            );
                                          return (
                                            <button
                                              key={d.value}
                                              type="button"
                                              onClick={() =>
                                                toggleEditingRecurringDay(d.value)
                                              }
                                              className={`px-2 py-1 rounded-full text-[11px] border ${
                                                active
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "bg-card text-muted-foreground border-border hover:text-foreground"
                                              }`}
                                            >
                                              {d.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <Label className="text-xs">Start time</Label>
                                    <Input
                                      type="time"
                                      value={editingRecurringState.startTime}
                                      onChange={(e) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          startTime: e.target.value,
                                        })
                                      }
                                      className="bg-background h-8 text-xs w-28"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-xs">Duration (min)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editingRecurringState.duration}
                                      onChange={(e) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          duration:
                                            e.target.value === ""
                                              ? ""
                                              : Math.max(
                                                  1,
                                                  Number(e.target.value) || 1,
                                                ),
                                        })
                                      }
                                      className="bg-background h-8 text-xs w-24"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-border">
                                  <div className="flex items-center gap-3">
                                    <Switch
                                      checked={editingRecurringState.notify}
                                      onCheckedChange={(checked) =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          notify: checked,
                                        })
                                      }
                                    />
                                    <span className="text-xs">
                                      Notify me before start
                                    </span>
                                    <button
                                      type="button"
                                      className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                      onClick={() =>
                                        setEditingRecurringState({
                                          ...editingRecurringState,
                                          isActive: !editingRecurringState.isActive,
                                        })
                                      }
                                    >
                                      {editingRecurringState.isActive
                                        ? "Pause template"
                                        : "Mark as active"}
                                    </button>
                                  </div>
                                  {editingRecurringState.notify && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] text-muted-foreground">
                                        Notify
                                      </span>
                                      {[5, 15, 30, 60].map((m) => (
                                        <button
                                          key={m}
                                          type="button"
                                          onClick={() =>
                                            setEditingRecurringState({
                                              ...editingRecurringState,
                                              notifyBefore: m,
                                            })
                                          }
                                          className={`px-2 py-1 rounded-full text-[11px] border ${
                                            editingRecurringState.notifyBefore === m
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
                                        value={editingRecurringState.notifyBefore}
                                        onChange={(e) =>
                                          setEditingRecurringState({
                                            ...editingRecurringState,
                                            notifyBefore: Math.max(
                                              1,
                                              Number(e.target.value) || 1,
                                            ),
                                          })
                                        }
                                        className="w-20 h-8 bg-background text-xs"
                                      />
                                      <span className="text-[11px] text-muted-foreground">
                                        minutes before
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex gap-2 md:self-end">
                                    <Button
                                      type="button"
                                      size="xs"
                                      onClick={handleSaveRecurringEdit}
                                      disabled={!editingRecurringState.title.trim()}
                                    >
                                      Save changes
                                    </Button>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingRecurringId(null);
                                        setEditingRecurringState(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Task list */}
        <section className="space-y-4">
          {planBannerVisible && isToday && !breakDay && (
            <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-4 text-sm">
              No plan logged for today. Add at least one task to start tracking.
            </div>
          )}
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
          {breakDay ? (
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">
                Break day — {breakDay.break_type ?? "Unspecified"}
              </p>
              {breakDay.note && (
                <p className="text-sm text-muted-foreground">{breakDay.note}</p>
              )}
              <p className="text-xs text-muted-foreground">No tasks tracked.</p>
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={async () => {
                    await removeBreakDay(currentDate);
                    await fetchTasksForDate(currentDate);
                    await fetchPlanRecord(currentDate);
                  }}
                >
                  Remove break day
                </Button>
              )}
            </div>
          ) : loading ? (
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
        {!breakDay && (
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
        )}
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

