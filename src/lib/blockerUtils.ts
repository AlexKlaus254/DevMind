type EntryLike = {
  was_blocked?: boolean | null;
  blocker_note?: string | null;
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have",
  "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "must", "can", "it", "its", "this", "that", "i", "me", "my", "we",
  "they", "them", "what", "which", "who", "when", "where", "why", "how", "just",
  "not", "no", "so", "if", "then", "than", "into", "out", "up", "down", "get",
  "got", "stuck", "blocked", "blocking",
]);

/**
 * Returns count and percentage of entries where was_blocked is true.
 */
export function getBlockerFrequency(entries: EntryLike[]): {
  count: number;
  percentage: number;
} {
  if (entries.length === 0) return { count: 0, percentage: 0 };
  const count = entries.filter((e) => e.was_blocked === true).length;
  const percentage = Math.round((count / entries.length) * 100);
  return { count, percentage };
}

/**
 * Top 5 most frequent words in blocker_note text (stop words removed).
 */
export function getCommonBlockerWords(entries: EntryLike[]): string[] {
  const text = entries
    .filter((e) => e.was_blocked && e.blocker_note?.trim())
    .map((e) => (e.blocker_note ?? "").toLowerCase())
    .join(" ");
  const words = text.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

export type BlockerTrend = "increasing" | "decreasing" | "stable";

type EntryWithDate = EntryLike & { created_at?: string | null };

/**
 * Compares blocker frequency in first half vs second half of entries (by date).
 */
export function getBlockerTrend(entries: EntryWithDate[]): BlockerTrend {
  if (entries.length < 4) return "stable";
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.created_at ?? 0).getTime() -
      new Date(b.created_at ?? 0).getTime(),
  );
  const half = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, half);
  const second = sorted.slice(half);
  const p1 = first.filter((e) => e.was_blocked === true).length / first.length;
  const p2 = second.filter((e) => e.was_blocked === true).length / second.length;
  const diff = p2 - p1;
  if (diff > 0.1) return "increasing";
  if (diff < -0.1) return "decreasing";
  return "stable";
}
