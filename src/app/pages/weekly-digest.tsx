import * as React from "react";
import { Link } from "react-router";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { getLastEntryGap, getSilentDaysForProject } from "../../lib/silenceUtils";
import { computeRiskScore } from "../../lib/riskScore";
import {
  getBlockerFrequency,
  getCommonBlockerWords,
} from "../../lib/blockerUtils";
import { Skeleton } from "../components/ui/skeleton";

function getWeekRange(weeksAgo: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * (weeksAgo + 1) + 1);
  start.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setDate(endCopy.getDate() - 7 * weeksAgo);
  endCopy.setHours(23, 59, 59, 999);
  return { start, end: endCopy };
}

function isInRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return d >= start.getTime() && d <= end.getTime();
}

export function WeeklyDigest() {
  const { projects, loading } = useProjects();
  const { entries, entriesByProject } = useAllJournalEntries();
  const activeProjects = projects.filter((p) => p.status === "active");
  const userHistory = {
    total: projects.length,
    abandoned: projects.filter((p) => p.status === "abandoned").length,
  };

  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(1);

  const entriesThisWeek = entries.filter((e) =>
    isInRange(e.created_at, thisWeek.start, thisWeek.end),
  );
  const entriesLastWeek = entries.filter((e) =>
    isInRange(e.created_at, lastWeek.start, lastWeek.end),
  );

  const avgEnergy = (arr: { energy_score?: number | null }[]) =>
    arr.length === 0
      ? 0
      : Math.round((arr.reduce((s, e) => s + (e.energy_score ?? 0), 0) / arr.length) * 10) / 10;
  const avgConfidence = (arr: { confidence_score?: number | null }[]) =>
    arr.length === 0
      ? 0
      : Math.round((arr.reduce((s, e) => s + (e.confidence_score ?? 0), 0) / arr.length) * 10) / 10;

  const projectsTouchedThisWeek = new Set(
    entriesThisWeek.map((e) => e.project_id).filter(Boolean),
  ).size;

  const bestSessionThisWeek =
    entriesThisWeek.length === 0
      ? null
      : entriesThisWeek.reduce((best, e) => {
          const sum = (e.energy_score ?? 0) + (e.confidence_score ?? 0);
          return !best || sum > (best.energy_score ?? 0) + (best.confidence_score ?? 0)
            ? e
            : best;
        }, null as typeof entriesThisWeek[0] | null);

  const blockerWordsThisWeek = getCommonBlockerWords(
    entriesThisWeek.filter((e) => e.was_blocked),
  );
  const moodWords = entriesThisWeek
    .map((e) => e.mood_word?.trim())
    .filter(Boolean);
  const moodFreq = new Map<string, number>();
  moodWords.forEach((w) => moodFreq.set(w!, (moodFreq.get(w!) ?? 0) + 1));
  const mostCommonMood =
    moodFreq.size === 0
      ? null
      : Array.from(moodFreq.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const entriesByDay = new Map<string, number>();
  entriesThisWeek.forEach((e) => {
    if (!e.created_at) return;
    const key = e.created_at.slice(0, 10);
    entriesByDay.set(key, (entriesByDay.get(key) ?? 0) + 1);
  });
  const longestDay =
    entriesByDay.size === 0
      ? 0
      : Math.max(...Array.from(entriesByDay.values()), 0);

  const silentDaysThisWeek = activeProjects.reduce((sum, p) => {
    const projectEntries = entriesByProject.get(p.id) ?? [];
    const started = p.started_at ?? p.created_at ?? "";
    if (!started) return sum;
    const start = new Date(started);
    start.setHours(0, 0, 0, 0);
    let days = 0;
    const cursor = new Date(thisWeek.start);
    while (cursor.getTime() <= thisWeek.end.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      const hasEntry = projectEntries.some((e) =>
        e.created_at ? e.created_at.startsWith(key) : false,
      );
      if (!hasEntry && cursor.getTime() >= start.getTime()) days += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return sum + days;
  }, 0);

  const projectsWithNoEntryThisWeek = activeProjects.filter((p) => {
    const projectEntries = entriesByProject.get(p.id) ?? [];
    return !projectEntries.some((e) =>
      isInRange(e.created_at, thisWeek.start, thisWeek.end),
    );
  });

  const riskPerProject = activeProjects.map((p) => ({
    project: p,
    risk: computeRiskScore(
      p,
      entriesByProject.get(p.id) ?? [],
      userHistory,
    ),
  }));
  const highestRisk =
    riskPerProject.length === 0
      ? null
      : riskPerProject.reduce((a, b) =>
          a.risk.score >= b.risk.score ? a : b,
        );

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Weekly Digest</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold">Weekly Digest</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Factual summary of the past week
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">This week vs last week</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Entries this week</div>
              <div className="text-xl font-mono mt-1">{entriesThisWeek.length}</div>
              <div className="text-xs text-muted-foreground">
                Last week: {entriesLastWeek.length}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Avg energy this week</div>
              <div className="text-xl font-mono mt-1">{avgEnergy(entriesThisWeek)}</div>
              <div className="text-xs text-muted-foreground">
                Last week: {avgEnergy(entriesLastWeek)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Avg confidence this week</div>
              <div className="text-xl font-mono mt-1">{avgConfidence(entriesThisWeek)}</div>
              <div className="text-xs text-muted-foreground">
                Last week: {avgConfidence(entriesLastWeek)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground">Projects touched this week</div>
              <div className="text-xl font-mono mt-1">{projectsTouchedThisWeek}</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Active project status</h2>
          {activeProjects.length === 0 ? (
            <p className="text-muted-foreground">No active projects.</p>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p) => {
                const projectEntries = entriesByProject.get(p.id) ?? [];
                const gap = getLastEntryGap(projectEntries);
                const risk = computeRiskScore(p, projectEntries, userHistory);
                return (
                  <div
                    key={p.id}
                    className="bg-card border border-border rounded-lg p-4 flex flex-wrap justify-between gap-2"
                  >
                    <Link
                      to={`/app/projects/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      Last entry: {gap == null ? "never" : `${gap} days ago`}. Risk: {risk.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">What the data says</h2>
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            {bestSessionThisWeek && (
              <p className="text-sm">
                Best session this week: energy {bestSessionThisWeek.energy_score}, confidence{" "}
                {bestSessionThisWeek.confidence_score}.
              </p>
            )}
            {blockerWordsThisWeek.length > 0 && (
              <p className="text-sm">
                Most common blocker reported this week: {blockerWordsThisWeek.join(", ")}.
              </p>
            )}
            {mostCommonMood && (
              <p className="text-sm">Most common mood word this week: {mostCommonMood}.</p>
            )}
            <p className="text-sm">
              Longest work session by entry count in a day: {longestDay} entries.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Silence report</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Projects with no entry this week:{" "}
              {projectsWithNoEntryThisWeek.length === 0
                ? "None"
                : projectsWithNoEntryThisWeek.map((p) => p.name).join(", ")}
            </p>
            <p className="text-sm text-muted-foreground">
              Total silent days this week: {silentDaysThisWeek}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">One thing to watch</h2>
          {highestRisk && highestRisk.risk.score > 30 ? (
            <div className="bg-card border border-border rounded-lg p-6 border-l-4 border-l-amber-500">
              <p className="font-medium mb-1">{highestRisk.project.name}</p>
              <p className="text-sm text-muted-foreground mb-2">
                Highest risk this week: {highestRisk.risk.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {highestRisk.risk.factors.join(". ")}
              </p>
              <Link
                to={`/app/projects/${highestRisk.project.id}`}
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                View project
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">No high-risk projects this week.</p>
          )}
        </section>
      </div>
    </div>
  );
}
