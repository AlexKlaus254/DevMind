import type { Database } from "../types/database";

export type RecurringTaskRow =
  Database["public"]["Tables"]["recurring_tasks"]["Row"];

export type DailyTaskMinimal = Pick<
  Database["public"]["Tables"]["daily_tasks"]["Row"],
  "id" | "recurring_task_id" | "planned_date"
>;

function getDayNameLower(date: Date): string {
  const dayIndex = date.getDay(); // 0-6, Sunday=0
  const names = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  return names[dayIndex]!;
}

/**
 * Returns true if a recurring task should generate a daily task on the given date.
 *
 * Supported frequencies (stored as lowercase text in `frequency`):
 * - "daily"      → every calendar day
 * - "weekdays"   → Monday–Friday
 * - "weekends"   → Saturday–Sunday
 * - "custom"     → only if `custom_days` includes the day name (e.g. "monday")
 */
export function shouldTaskRunOnDate(
  task: RecurringTaskRow,
  date: Date,
): boolean {
  if (task.is_active === false) return false;

  const freq = (task.frequency ?? "daily").toLowerCase();
  const dayName = getDayNameLower(date);

  if (freq === "daily") return true;
  if (freq === "weekdays") {
    return dayName !== "saturday" && dayName !== "sunday";
  }
  if (freq === "weekends") {
    return dayName === "saturday" || dayName === "sunday";
  }
  if (freq === "custom") {
    const days = (task.custom_days ?? []).map((d) => d.toLowerCase());
    return days.includes(dayName);
  }

  // Unknown frequency: treat as disabled
  return false;
}

export type GeneratedRecurringTaskInput = {
  recurring_task_id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  planned_start_time: string | null;
  planned_duration_minutes: number | null;
  notify_at_start: boolean;
  notify_before_minutes: number | null;
};

/**
 * Computes which daily tasks should be created for a given date based on
 * the supplied recurring task templates and any already-existing daily tasks.
 *
 * This function is PURE: it does not perform any Supabase calls or cause side
 * effects. Callers are responsible for inserting the returned rows.
 */
export function generateDailyTasksFromRecurring(params: {
  recurringTasks: RecurringTaskRow[];
  date: string; // ISO date YYYY-MM-DD
  existingDailyTasks: DailyTaskMinimal[];
}): GeneratedRecurringTaskInput[] {
  const { recurringTasks, date, existingDailyTasks } = params;
  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) return [];

  const existingByRecurringId = new Set<string>();
  for (const t of existingDailyTasks) {
    if (
      t.recurring_task_id &&
      t.planned_date === date
    ) {
      existingByRecurringId.add(t.recurring_task_id);
    }
  }

  const toCreate: GeneratedRecurringTaskInput[] = [];

  for (const tmpl of recurringTasks) {
    if (!tmpl.id) continue;
    if (!shouldTaskRunOnDate(tmpl, dateObj)) continue;
    if (existingByRecurringId.has(tmpl.id)) continue;

    toCreate.push({
      recurring_task_id: tmpl.id,
      title: tmpl.title,
      description: tmpl.description ?? null,
      project_id: tmpl.project_id ?? null,
      planned_start_time: tmpl.planned_start_time,
      planned_duration_minutes: tmpl.planned_duration_minutes,
      notify_at_start: tmpl.notify_at_start ?? false,
      notify_before_minutes: tmpl.notify_before_minutes ?? 15,
    });
  }

  return toCreate;
}

