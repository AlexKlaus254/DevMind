import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";
import {
  generateDailyTasksFromRecurring,
  type DailyTaskMinimal,
  type RecurringTaskRow as RecurringTaskTemplateRow,
} from "../lib/recurringTaskUtils";

export type DailyTaskRow =
  Database["public"]["Tables"]["daily_tasks"]["Row"];

export type RecurringTaskRow =
  Database["public"]["Tables"]["recurring_tasks"]["Row"];

export type DailyTaskStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped"
  | "postponed";

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  project_id?: string | null;
  planned_date: string;
  planned_start_time?: string | null;
  planned_duration_minutes?: number | null;
  notify_at_start?: boolean;
  notify_before_minutes?: number | null;
};

export function useDailyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = React.useState<DailyTaskRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recurringTasks, setRecurringTasks] = React.useState<RecurringTaskRow[]>([]);
  const [recurringLoading, setRecurringLoading] = React.useState(false);
  const [recurringError, setRecurringError] = React.useState<string | null>(null);

  const fetchTasksForDate = React.useCallback(
    async (date: string) => {
      if (!user?.id) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("planned_date", date)
        .order("planned_start_time", {
          ascending: true,
          nullsFirst: false,
        });
      if (err) {
        setError(parseSupabaseError(err));
        setTasks([]);
        setLoading(false);
        return;
      }
      setTasks((data ?? []) as DailyTaskRow[]);
      setLoading(false);
    },
    [user?.id],
  );

  const fetchRecurringTasks = React.useCallback(async () => {
    if (!user?.id) {
      setRecurringTasks([]);
      setRecurringLoading(false);
      return;
    }
    setRecurringLoading(true);
    setRecurringError(null);
    const { data, error: err } = await supabase
      .from("recurring_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (err) {
      setRecurringError(parseSupabaseError(err));
      setRecurringTasks([]);
      setRecurringLoading(false);
      return;
    }
    setRecurringTasks((data ?? []) as RecurringTaskRow[]);
    setRecurringLoading(false);
  }, [user?.id]);

  const fetchTasksForProject = React.useCallback(
    async (projectId: string) => {
      if (!user?.id) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("planned_date", { ascending: true })
        .order("planned_start_time", {
          ascending: true,
          nullsFirst: false,
        });
      if (err) {
        setError(parseSupabaseError(err));
        setTasks([]);
        setLoading(false);
        return;
      }
      setTasks((data ?? []) as DailyTaskRow[]);
      setLoading(false);
    },
    [user?.id],
  );

  const createTask = React.useCallback(
    async (input: CreateTaskInput): Promise<DailyTaskRow | null> => {
      if (!user?.id) return null;
      if (!input.title.trim()) {
        setError("Task title is required.");
        return null;
      }
      setError(null);
      const { data, error: err } = await supabase
        .from("daily_tasks")
        .insert({
          user_id: user.id,
          project_id: input.project_id ?? null,
          title: input.title.trim(),
          description: input.description ?? null,
          planned_date: input.planned_date,
          planned_start_time: input.planned_start_time ?? null,
          planned_duration_minutes: input.planned_duration_minutes ?? null,
          notify_at_start: input.notify_at_start ?? false,
          notify_before_minutes: input.notify_before_minutes ?? 15,
          status: "planned",
        })
        .select()
        .single();
      if (err) {
        setError(parseSupabaseError(err));
        return null;
      }
      const row = data as DailyTaskRow;
      setTasks((prev) => {
        const sameDate = prev.length
          ? prev[0].planned_date
          : row.planned_date;
        if (sameDate === row.planned_date) {
          return [...prev, row].sort((a, b) =>
            (a.planned_start_time ?? "") <= (b.planned_start_time ?? "")
              ? -1
              : 1,
          );
        }
        return prev;
      });
      return row;
    },
    [user?.id],
  );

  const updateTaskStatus = React.useCallback(
    async (
      id: string,
      status: DailyTaskStatus,
      note?: string,
    ): Promise<boolean> => {
      setError(null);
      const updates: Partial<DailyTaskRow> = { status };
      if (status === "completed") {
        updates.completion_note = note ?? null;
      } else if (status === "skipped") {
        updates.skip_reason = note ?? null;
      }
      if (status === "planned") {
        updates.actual_start_time = null;
        updates.actual_duration_minutes = null;
      }
      const { error: err } = await supabase
        .from("daily_tasks")
        .update(updates)
        .eq("id", id);
      if (err) {
        setError(parseSupabaseError(err));
        return false;
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      return true;
    },
    [],
  );

  const updateActualTime = React.useCallback(
    async (
      id: string,
      actualStart: string,
      actualDurationMinutes: number,
    ): Promise<boolean> => {
      setError(null);
      const { error: err } = await supabase
        .from("daily_tasks")
        .update({
          actual_start_time: actualStart,
          actual_duration_minutes: actualDurationMinutes,
        })
        .eq("id", id);
      if (err) {
        setError(parseSupabaseError(err));
        return false;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                actual_start_time: actualStart,
                actual_duration_minutes: actualDurationMinutes,
              }
            : t,
        ),
      );
      return true;
    },
    [],
  );

  /**
   * Generates missing daily_tasks for a given date from the user's recurring
   * task templates. This function is safe to call multiple times for the same
   * date; it only inserts rows that do not already exist.
   */
  const generateRecurringTasksForDate = React.useCallback(
    async (date: string): Promise<void> => {
      if (!user?.id) return;

      // Always read current templates from the database so changes are reflected.
      const { data: tmplData, error: tmplErr } = await supabase
        .from("recurring_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (tmplErr) {
        setRecurringError(parseSupabaseError(tmplErr));
        return;
      }
      const templates = (tmplData ?? []) as RecurringTaskTemplateRow[];
      setRecurringTasks(templates);

      if (templates.length === 0) return;

      const { data: existingData, error: existingErr } = await supabase
        .from("daily_tasks")
        .select("id,recurring_task_id,planned_date")
        .eq("user_id", user.id)
        .eq("planned_date", date);
      if (existingErr) {
        setError(parseSupabaseError(existingErr));
        return;
      }

      const existing = (existingData ?? []) as DailyTaskMinimal[];
      const toCreate = generateDailyTasksFromRecurring({
        recurringTasks: templates,
        date,
        existingDailyTasks: existing,
      });

      if (toCreate.length === 0) return;

      const insertPayload = toCreate.map((t) => ({
        user_id: user.id,
        project_id: t.project_id,
        title: t.title,
        description: t.description,
        planned_date: date,
        planned_start_time: t.planned_start_time,
        planned_duration_minutes: t.planned_duration_minutes,
        notify_at_start: t.notify_at_start,
        notify_before_minutes: t.notify_before_minutes,
        status: "planned",
        is_recurring: true,
        recurring_task_id: t.recurring_task_id,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("daily_tasks")
        .insert(insertPayload)
        .select();
      if (insertErr) {
        setError(parseSupabaseError(insertErr));
        return;
      }

      const insertedRows = (inserted ?? []) as DailyTaskRow[];
      setTasks((prev) => {
        // If we're already looking at this date, merge; otherwise leave as is.
        if (prev.length === 0 || prev[0].planned_date !== date) {
          return prev;
        }
        const merged = [...prev, ...insertedRows];
        return merged.sort((a, b) =>
          (a.planned_start_time ?? "") <= (b.planned_start_time ?? "")
            ? -1
            : 1,
        );
      });
    },
    [user?.id],
  );

  return {
    tasks,
    loading,
    error,
    fetchTasksForDate,
    fetchTasksForProject,
    createTask,
    updateTaskStatus,
    updateActualTime,
    recurringTasks,
    recurringLoading,
    recurringError,
    fetchRecurringTasks,
    generateRecurringTasksForDate,
  };
}

export async function getCompletionRate(
  userId: string,
  days: number,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("status, planned_date")
    .eq("user_id", userId)
    .gte("planned_date", cutoffIso);
  if (error || !data) return 0;
  const rows = data as Pick<DailyTaskRow, "status" | "planned_date">[];
  const relevant = rows.filter((t) =>
    ["planned", "in_progress", "completed", "skipped", "postponed"].includes(
      (t.status ?? "") as DailyTaskStatus,
    ),
  );
  if (relevant.length === 0) return 0;
  const completed = relevant.filter((t) => t.status === "completed").length;
  return Math.round((completed / relevant.length) * 100);
}

export async function getAvoidancePatterns(userId: string) {
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("title, project_id, status, planned_date")
    .eq("user_id", userId);
  if (error || !data) return [];
  type Row = Pick<
    DailyTaskRow,
    "title" | "project_id" | "status" | "planned_date"
  >;
  const rows = data as Row[];

  const groups = new Map<
    string,
    { title: string; project_id: string | null; skipped: number; total: number }
  >();

  for (const t of rows) {
    const keyTitle = (t.title ?? "").trim().toLowerCase();
    if (!keyTitle) continue;
    const key = `${keyTitle}::${t.project_id ?? "standalone"}`;
    const g =
      groups.get(key) ?? {
        title: t.title ?? "",
        project_id: t.project_id ?? null,
        skipped: 0,
        total: 0,
      };
    g.total += 1;
    if (t.status === "skipped" || t.status === "postponed") {
      g.skipped += 1;
    }
    groups.set(key, g);
  }

  const patterns = Array.from(groups.values())
    .filter((g) => g.skipped > 0)
    .sort((a, b) => b.skipped - a.skipped)
    .slice(0, 5)
    .map((g) => ({
      label: g.title,
      skipped: g.skipped,
      total: g.total,
    }));

  return patterns;
}

