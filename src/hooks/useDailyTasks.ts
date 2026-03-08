import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type DailyTaskRow =
  Database["public"]["Tables"]["daily_tasks"]["Row"];

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

  return {
    tasks,
    loading,
    error,
    fetchTasksForDate,
    fetchTasksForProject,
    createTask,
    updateTaskStatus,
    updateActualTime,
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

