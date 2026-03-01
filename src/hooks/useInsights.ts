import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";
import type { ProjectRow } from "./useProjects";
import type { JournalEntryRow } from "./useJournal";
import type { PostMortemRow } from "./usePostMortem";
import { getSilentDaysForProject } from "../lib/silenceUtils";

export type AiInsightRow =
  Database["public"]["Tables"]["ai_insights"]["Row"];

export type ProjectPattern = {
  id: string;
  title: string;
  description: string;
  projectIds: string[];
  projectNames: Record<string, string>;
};

export type GrowthTrajectory = "improving" | "regressing" | "insufficient_data";

export function useInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = React.useState<AiInsightRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [entries, setEntries] = React.useState<JournalEntryRow[]>([]);
  const [postMortems, setPostMortems] = React.useState<PostMortemRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInsights = React.useCallback(async () => {
    if (!user?.id) {
      setInsights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [insightsRes, projectsRes, entriesRes, pmRes] = await Promise.all([
      supabase
        .from("ai_insights")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_postmortems")
        .select("*")
        .eq("user_id", user.id),
    ]);
    if (insightsRes.error) {
      setError(parseSupabaseError(insightsRes.error));
    } else {
      setInsights((insightsRes.data ?? []) as AiInsightRow[]);
    }
    if (projectsRes.error) {
      setError(parseSupabaseError(projectsRes.error));
    } else {
      setProjects((projectsRes.data ?? []) as ProjectRow[]);
    }
    if (entriesRes.error) {
      setError(parseSupabaseError(entriesRes.error));
    } else {
      setEntries((entriesRes.data ?? []) as JournalEntryRow[]);
    }
    if (pmRes.error) {
      setError(parseSupabaseError(pmRes.error));
    } else {
      setPostMortems((pmRes.data ?? []) as PostMortemRow[]);
    }
    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const entriesByProject = React.useMemo(() => {
    const map = new Map<string, JournalEntryRow[]>();
    for (const e of entries) {
      const pid = e.project_id ?? "";
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(e);
    }
    return map;
  }, [entries]);

  const projectMap = React.useMemo(() => {
    const map = new Map<string, ProjectRow>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  const fetchProjectPatterns = React.useCallback((): ProjectPattern[] => {
    const patterns: ProjectPattern[] = [];
    const total = projects.length;
    if (total === 0) return patterns;

    const abandoned = projects.filter((p) => p.status === "abandoned");
    const abandonedRate =
      total === 0 ? 0 : Math.round((abandoned.length / total) * 100);
    const abandonedNames: Record<string, string> = {};
    abandoned.forEach((p) => {
      abandonedNames[p.id] = p.name;
    });
    patterns.push({
      id: "abandonment",
      title: "Abandonment rate",
      description: `You abandoned ${abandoned.length} of ${total} projects (${abandonedRate}%).${abandoned.length > 0 ? " Abandoned: " + abandoned.map((p) => p.name).join(", ") + "." : ""}`,
      projectIds: abandoned.map((p) => p.id),
      projectNames: abandonedNames,
    });

    let lowConfidenceBeforeEndCount = 0;
    const lowConfProjects: ProjectRow[] = [];
    for (const p of projects.filter(
      (pr) => pr.status === "abandoned" || pr.status === "paused",
    )) {
      const projectEntries = entriesByProject.get(p.id) ?? [];
      const sorted = [...projectEntries].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
      const lastEntry = sorted[0];
      if (lastEntry && (lastEntry.confidence_score ?? 10) < 4) {
        lowConfidenceBeforeEndCount++;
        lowConfProjects.push(p);
      }
    }
    if (lowConfidenceBeforeEndCount > 0) {
      const names: Record<string, string> = {};
      lowConfProjects.forEach((p) => {
        names[p.id] = p.name;
      });
      patterns.push({
        id: "silence-confidence",
        title: "Silence correlation",
        description: `In ${lowConfidenceBeforeEndCount} project(s) that ended (abandoned or paused), the last entry had a confidence score below 4.`,
        projectIds: lowConfProjects.map((p) => p.id),
        projectNames: names,
      });
    }

    const withDeadline = projects.filter(
      (p) => p.has_deadline === true || (p.deadline_date != null && p.deadline_date !== ""),
    );
    const withoutDeadline = projects.filter(
      (p) => !p.has_deadline && (p.deadline_date == null || p.deadline_date === ""),
    );
    const completedWith = withDeadline.filter((p) => p.status === "completed").length;
    const completedWithout = withoutDeadline.filter((p) => p.status === "completed").length;
    const rateWith =
      withDeadline.length === 0
        ? 0
        : Math.round((completedWith / withDeadline.length) * 100);
    const rateWithout =
      withoutDeadline.length === 0
        ? 0
        : Math.round((completedWithout / withoutDeadline.length) * 100);
    patterns.push({
      id: "deadline",
      title: "Deadline effect",
      description: `Completion rate with deadline set: ${rateWith}% (${completedWith}/${withDeadline.length}). Without deadline: ${rateWithout}% (${completedWithout}/${withoutDeadline.length}).`,
      projectIds: [],
      projectNames: {},
    });

    const byMotivation = new Map<string, ProjectRow[]>();
    for (const p of projects) {
      const key = p.motivation ?? "not set";
      if (!byMotivation.has(key)) byMotivation.set(key, []);
      byMotivation.get(key)!.push(p);
    }
    const motivationLines: string[] = [];
    byMotivation.forEach((projs, mot) => {
      const completed = projs.filter((p) => p.status === "completed").length;
      const rate = projs.length === 0 ? 0 : Math.round((completed / projs.length) * 100);
      motivationLines.push(`${mot}: ${rate}% (${completed}/${projs.length})`);
    });
    if (motivationLines.length > 0) {
      patterns.push({
        id: "motivation",
        title: "Motivation correlation",
        description: `Completion rate by motivation: ${motivationLines.join(". ")}`,
        projectIds: [],
        projectNames: {},
      });
    }

    const energyTrendProjects: { name: string; id: string; trend: "up" | "down" | "flat" }[] = [];
    for (const p of projects) {
      const projectEntries = entriesByProject.get(p.id) ?? [];
      if (projectEntries.length < 6) continue;
      const sorted = [...projectEntries].sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime(),
      );
      const first3 = sorted.slice(0, 3);
      const last3 = sorted.slice(-3);
      const avgFirst =
        first3.reduce((s, e) => s + (e.energy_score ?? 0), 0) / first3.length;
      const avgLast =
        last3.reduce((s, e) => s + (e.energy_score ?? 0), 0) / last3.length;
      const diff = avgLast - avgFirst;
      const trend = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "flat";
      energyTrendProjects.push({ id: p.id, name: p.name, trend });
    }
    const goingUp = energyTrendProjects.filter((x) => x.trend === "up").length;
    const goingDown = energyTrendProjects.filter((x) => x.trend === "down").length;
    if (energyTrendProjects.length > 0) {
      patterns.push({
        id: "energy-trend",
        title: "Energy trend",
        description: `Across projects with 6+ entries: energy went up in ${goingUp}, down in ${goingDown}, stable in ${energyTrendProjects.length - goingUp - goingDown}.`,
        projectIds: energyTrendProjects.map((x) => x.id),
        projectNames: Object.fromEntries(
          energyTrendProjects.map((x) => [x.id, x.name]),
        ),
      });
    }

    const solo = projects.filter((p) => p.is_solo === true);
    const team = projects.filter((p) => p.is_solo === false);
    const soloCompleted = solo.filter((p) => p.status === "completed").length;
    const teamCompleted = team.filter((p) => p.status === "completed").length;
    const soloRate = solo.length === 0 ? 0 : Math.round((soloCompleted / solo.length) * 100);
    const teamRate = team.length === 0 ? 0 : Math.round((teamCompleted / team.length) * 100);
    patterns.push({
      id: "solo-team",
      title: "Solo vs team",
      description: `Solo projects: ${soloRate}% completion (${soloCompleted}/${solo.length}). Team: ${teamRate}% (${teamCompleted}/${team.length}).`,
      projectIds: [],
      projectNames: {},
    });

    return patterns;
  }, [projects, entriesByProject]);

  const computeGrowthTrajectory = React.useCallback((): GrowthTrajectory => {
    const completedOrAbandoned = projects.filter(
      (p) => p.status === "completed" || p.status === "abandoned",
    );
    if (completedOrAbandoned.length < 4) return "insufficient_data";
    const sorted = [...completedOrAbandoned].sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime(),
    );
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    const rate1 =
      firstHalf.length === 0
        ? 0
        : (firstHalf.filter((p) => p.status === "completed").length /
            firstHalf.length) *
          100;
    const rate2 =
      secondHalf.length === 0
        ? 0
        : (secondHalf.filter((p) => p.status === "completed").length /
            secondHalf.length) *
          100;
    if (rate2 > rate1 + 5) return "improving";
    if (rate2 < rate1 - 5) return "regressing";
    return "improving";
  }, [projects]);

  const totalSilentDays = React.useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    return active.reduce((sum, p) => {
      const projectEntries = entriesByProject.get(p.id) ?? [];
      const started = p.started_at ?? p.created_at ?? "";
      if (!started) return sum;
      return sum + getSilentDaysForProject(projectEntries, started);
    }, 0);
  }, [projects, entriesByProject]);

  const completionRate =
    projects.length === 0
      ? 0
      : Math.round(
          (projects.filter((p) => p.status === "completed").length / projects.length) *
            100,
        );
  const abandonmentRate =
    projects.length === 0
      ? 0
      : Math.round(
          (projects.filter((p) => p.status === "abandoned").length /
            projects.length) *
            100,
        );
  const avgEnergy =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + (e.energy_score ?? 0), 0) / entries.length) *
            10,
        ) / 10;
  const avgConfidence =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + (e.confidence_score ?? 0), 0) /
            entries.length) *
            10,
        ) / 10;

  const completionRateByMonth = React.useMemo(() => {
    const byMonth = new Map<string, { completed: number; total: number }>();
    for (const p of projects) {
      const created = p.created_at ?? "";
      if (!created) continue;
      const d = new Date(created);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth.has(key)) byMonth.set(key, { completed: 0, total: 0 });
      const cell = byMonth.get(key)!;
      cell.total += 1;
      if (p.status === "completed") cell.completed += 1;
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { completed, total }]) => ({
        month,
        rate: total === 0 ? 0 : Math.round((completed / total) * 100),
        completed,
        total,
      }));
  }, [projects]);

  const patterns = React.useMemo(() => fetchProjectPatterns(), [fetchProjectPatterns]);
  const growth = React.useMemo(
    () => computeGrowthTrajectory(),
    [computeGrowthTrajectory],
  );

  return {
    insights,
    projects,
    entries,
    postMortems,
    patterns,
    growth,
    loading,
    error,
    fetchInsights,
    totalSilentDays,
    completionRate,
    abandonmentRate,
    avgEnergy,
    avgConfidence,
    completionRateByMonth,
    projectMap,
  };
}
