type EntryWithDate = { created_at: string | null };

/**
 * Consistency = percentage of active project weeks that had at least one journal entry.
 * Returns score 0-100 and label.
 */
export function computeConsistencyScore(
  entries: EntryWithDate[],
  projectStartDate: string,
): { score: number; label: string } {
  const start = new Date(projectStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start.getTime() > today.getTime()) {
    return { score: 0, label: "Largely silent" };
  }

  const weeksWithEntry = new Set<string>();
  for (const e of entries) {
    if (!e.created_at) continue;
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= start.getTime() && d.getTime() <= today.getTime()) {
      weeksWithEntry.add(getWeekKey(d));
    }
  }

  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  let totalWeeks = 0;
  let withEntry = 0;
  while (cursor.getTime() <= today.getTime()) {
    totalWeeks += 1;
    if (weeksWithEntry.has(getWeekKey(cursor))) withEntry += 1;
    cursor.setDate(cursor.getDate() + 7);
  }
  totalWeeks = Math.max(1, totalWeeks);

  const score = Math.round((withEntry / totalWeeks) * 100);

  let label: string;
  if (score >= 90) label = "Consistent";
  else if (score >= 70) label = "Mostly consistent";
  else if (score >= 50) label = "Inconsistent";
  else label = "Largely silent";

  return { score, label };
}

function getWeekKey(d: Date): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy.toISOString().slice(0, 10);
}
