/**
 * Client-side silence tracking from journal entry data.
 * No backend job yet; all computed from entries.
 */

type EntryWithDate = { created_at: string | null };

/**
 * Returns count of calendar days where the project was active (on or after
 * projectStartDate) and no entry exists for that day.
 */
export function getSilentDaysForProject(
  entries: EntryWithDate[],
  projectStartDate: string,
): number {
  const start = new Date(projectStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start.getTime() > today.getTime()) return 0;

  const daysWithEntry = new Set<string>();
  for (const e of entries) {
    if (!e.created_at) continue;
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= start.getTime() && d.getTime() <= today.getTime()) {
      daysWithEntry.add(d.toISOString().slice(0, 10));
    }
  }

  let totalDays = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= today.getTime()) {
    totalDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return totalDays - daysWithEntry.size;
}

/**
 * Returns the longest consecutive run of days with no entry since project started.
 */
export function getLongestSilenceStreak(
  entries: EntryWithDate[],
  projectStartDate: string,
): number {
  const start = new Date(projectStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start.getTime() > today.getTime()) return 0;

  const daysWithEntry = new Set<string>();
  for (const e of entries) {
    if (!e.created_at) continue;
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= start.getTime() && d.getTime() <= today.getTime()) {
      daysWithEntry.add(d.toISOString().slice(0, 10));
    }
  }

  let maxStreak = 0;
  let currentStreak = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= today.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    if (daysWithEntry.has(key)) {
      currentStreak = 0;
    } else {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return maxStreak;
}

/**
 * Returns number of days since the most recent entry, or null if no entries.
 */
export function getLastEntryGap(entries: EntryWithDate[]): number | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
  const last = sorted[0]?.created_at;
  if (!last) return null;
  const lastDate = new Date(last);
  lastDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
