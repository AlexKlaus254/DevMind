import { getLastEntryGap } from "./silenceUtils";

export type RiskLabel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type RiskResult = {
  score: number;
  label: RiskLabel;
  factors: string[];
};

type ProjectLike = {
  id: string;
  has_deadline?: boolean | null;
  deadline_date?: string | null;
  motivation?: string | null;
};

type EntryLike = {
  created_at: string | null;
  confidence_score?: number | null;
  energy_score?: number | null;
};

type UserHistoryLike = {
  total: number;
  abandoned: number;
};

/**
 * Computes abandonment risk score 0-100 and label.
 * Weights: silence >7d +30, 3-7d +15; last confidence <4 +20; last energy <3 +15;
 * no deadline +10; motivation obligation +10; user abandonment rate >50% +15. Cap 100.
 */
export function computeRiskScore(
  project: ProjectLike,
  entries: EntryLike[],
  userHistory: UserHistoryLike,
): RiskResult {
  const factors: string[] = [];
  let score = 0;

  const gap = getLastEntryGap(entries);
  if (gap !== null) {
    if (gap > 7) {
      score += 30;
      factors.push(`Silent for ${gap} days`);
    } else if (gap >= 3) {
      score += 15;
      factors.push(`Silent for ${gap} days`);
    }
  }

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
  const lastEntry = sorted[0];
  if (lastEntry) {
    const conf = lastEntry.confidence_score ?? 10;
    if (conf < 4) {
      score += 20;
      factors.push(`Last confidence score: ${conf}`);
    }
    const energy = lastEntry.energy_score ?? 10;
    if (energy < 3) {
      score += 15;
      factors.push(`Last energy score: ${energy}`);
    }
  }

  const hasDeadline =
    project.has_deadline === true ||
    (project.deadline_date != null && project.deadline_date !== "");
  if (!hasDeadline) {
    score += 10;
    factors.push("No deadline set");
  }

  if ((project.motivation ?? "").toLowerCase() === "obligation") {
    score += 10;
    factors.push("Motivation is obligation");
  }

  const abandonmentRate =
    userHistory.total === 0 ? 0 : userHistory.abandoned / userHistory.total;
  if (abandonmentRate > 0.5) {
    score += 15;
    factors.push("Your abandonment rate is above 50%");
  }

  score = Math.min(100, score);

  let label: RiskLabel;
  if (score <= 30) label = "LOW";
  else if (score <= 60) label = "MODERATE";
  else if (score <= 80) label = "HIGH";
  else label = "CRITICAL";

  return { score, label, factors };
}
