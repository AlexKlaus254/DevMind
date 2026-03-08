type TaskForNotification = {
  id: string;
  title: string;
  planned_date: string | null;
  planned_start_time: string | null;
  notify_before_minutes: number | null;
};

const timeoutsByTask = new Map<string, number>();

export function scheduleTaskNotification(task: TaskForNotification) {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined"
  ) {
    return null;
  }
  if (!task.planned_date || !task.planned_start_time) return null;

  const permission = Notification.permission;
  if (permission !== "granted") {
    return null;
  }

  const [h, m] = task.planned_start_time.split(":");
  const planned = new Date(task.planned_date);
  planned.setHours(Number(h) || 0, Number(m) || 0, 0, 0);

  const offsetMinutes = task.notify_before_minutes ?? 15;
  const target = new Date(planned.getTime() - offsetMinutes * 60 * 1000);
  const delay = target.getTime() - Date.now();
  if (delay <= 0) return null;

  const timeoutId = window.setTimeout(() => {
    try {
      // Browser notification only; email/Telegram handled in a later phase.
      new Notification("DevMind Task Reminder", {
        body: `Starting soon: ${task.title}`,
        icon: "/favicon.svg",
      });
    } catch {
      // ignore
    } finally {
      timeoutsByTask.delete(task.id);
    }
  }, delay);

  timeoutsByTask.set(task.id, timeoutId);
  return timeoutId;
}

export function cancelTaskNotification(timeoutId: number) {
  clearTimeout(timeoutId);
}

export function cancelTaskNotificationByTaskId(taskId: string) {
  const id = timeoutsByTask.get(taskId);
  if (id != null) {
    clearTimeout(id);
    timeoutsByTask.delete(taskId);
  }
}

export function clearAllTaskNotifications() {
  for (const id of timeoutsByTask.values()) {
    clearTimeout(id);
  }
  timeoutsByTask.clear();
}

