import * as React from "react";
import { supabase } from "../lib/supabase";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";
import { getCommonBlockerWords } from "../lib/blockerUtils";
import { getISOWeek, getISOWeekYear } from "date-fns";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type JournalEntryRow =
  Database["public"]["Tables"]["journal_entries"]["Row"];

export type TeamWeeklyArcPoint = {
  week: string;
  avgEnergy: number;
  avgConfidence: number;
  count: number;
};

export type TeamData = {
  members: Pick<ProfileRow, "id" | "name" | "role">[];
  projectStats: {
    total: number;
    completed: number;
    abandoned: number;
    active: number;
  };
  averages: {
    avgEnergy: number;
    avgConfidence: number;
    totalEntries: number;
    avgEnergyThisMonth: number;
    avgConfidenceThisMonth: number;
    totalEntriesThisMonth: number;
  };
  silentMembers: number;
  weeklyArc: TeamWeeklyArcPoint[];
  commonBlockers: string[];
};

export function useTeamData(orgId: string | null) {
  const [teamData, setTeamData] = React.useState<TeamData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTeamData = React.useCallback(async () => {
    if (!orgId) {
      setTeamData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: membersRaw, error: membersErr } = await supabase
        .from("profiles")
        .select("id,name,role")
        .eq("org_id", orgId)
        .eq("role", "member");

      if (membersErr) {
        throw membersErr;
      }

      const members = (membersRaw ?? []) as ProfileRow[];
      const memberIds = members.map((m) => m.id);

      if (memberIds.length === 0) {
        setTeamData({
          members: [],
          projectStats: { total: 0, completed: 0, abandoned: 0, active: 0 },
          averages: {
            avgEnergy: 0,
            avgConfidence: 0,
            totalEntries: 0,
            avgEnergyThisMonth: 0,
            avgConfidenceThisMonth: 0,
            totalEntriesThisMonth: 0,
          },
          silentMembers: 0,
          weeklyArc: [],
          commonBlockers: [],
        });
        setLoading(false);
        return;
      }

      const [projectsRes, entriesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .in("user_id", memberIds),
        supabase
          .from("journal_entries")
          .select("*")
          .in("user_id", memberIds),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const projects = (projectsRes.data ?? []) as ProjectRow[];
      const entries = (entriesRes.data ?? []) as JournalEntryRow[];

      const totalProjects = projects.length;
      const completed =
        projects.filter((p) => p.status === "completed").length;
      const abandoned =
        projects.filter((p) => p.status === "abandoned").length;
      const active = projects.filter((p) => p.status === "active").length;

      const totalEntries = entries.length;
      const avgEnergy =
        totalEntries === 0
          ? 0
          : Math.round(
              (entries.reduce(
                (s, e) => s + (e.energy_score ?? 0),
                0,
              ) /
                totalEntries) *
                10,
            ) / 10;
      const avgConfidence =
        totalEntries === 0
          ? 0
          : Math.round(
              (entries.reduce(
                (s, e) => s + (e.confidence_score ?? 0),
                0,
              ) /
                totalEntries) *
                10,
            ) / 10;

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const entriesThisMonth = entries.filter((e) => {
        if (!e.created_at) return false;
        const d = new Date(e.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      const totalEntriesThisMonth = entriesThisMonth.length;
      const avgEnergyThisMonth =
        totalEntriesThisMonth === 0
          ? 0
          : Math.round(
              (entriesThisMonth.reduce(
                (s, e) => s + (e.energy_score ?? 0),
                0,
              ) /
                totalEntriesThisMonth) *
                10,
            ) / 10;
      const avgConfidenceThisMonth =
        totalEntriesThisMonth === 0
          ? 0
          : Math.round(
              (entriesThisMonth.reduce(
                (s, e) => s + (e.confidence_score ?? 0),
                0,
              ) /
                totalEntriesThisMonth) *
                10,
            ) / 10;

      // Silent members: last entry older than 7 days or no entries at all.
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const entriesByUser = new Map<
        string,
        { created_at: string | null }[]
      >();
      for (const e of entries) {
        const uid = e.user_id ?? "";
        if (!uid) continue;
        if (!entriesByUser.has(uid)) entriesByUser.set(uid, []);
        entriesByUser.get(uid)!.push({ created_at: e.created_at });
      }

      let silentMembers = 0;
      for (const m of members) {
        const userEntries = entriesByUser.get(m.id) ?? [];
        if (userEntries.length === 0) {
          silentMembers += 1;
          continue;
        }
        const sorted = [...userEntries].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
        );
        const last = sorted[0]?.created_at;
        if (!last) {
          silentMembers += 1;
          continue;
        }
        const lastMs = new Date(last).getTime();
        if (nowMs - lastMs > sevenDaysMs) {
          silentMembers += 1;
        }
      }

      // Weekly team emotional arc for last 8 weeks.
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 8);
      const buckets = new Map<
        string,
        { sumEnergy: number; sumConfidence: number; count: number; date: Date }
      >();

      for (const e of entries) {
        if (!e.created_at) continue;
        const d = new Date(e.created_at);
        if (d.getTime() < eightWeeksAgo.getTime()) continue;
        const key = `${getISOWeekYear(d)}-W${getISOWeek(d)
          .toString()
          .padStart(2, "0")}`;
        const existing = buckets.get(key) ?? {
          sumEnergy: 0,
          sumConfidence: 0,
          count: 0,
          date: d,
        };
        existing.sumEnergy += e.energy_score ?? 0;
        existing.sumConfidence += e.confidence_score ?? 0;
        existing.count += 1;
        if (d < existing.date) existing.date = d;
        buckets.set(key, existing);
      }

      const weeklyArc: TeamWeeklyArcPoint[] = Array.from(
        buckets.entries(),
      )
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .map(([key, bucket]) => ({
          week: key,
          avgEnergy:
            bucket.count === 0
              ? 0
              : Math.round(
                  (bucket.sumEnergy / bucket.count) * 10,
                ) / 10,
          avgConfidence:
            bucket.count === 0
              ? 0
              : Math.round(
                  (bucket.sumConfidence / bucket.count) * 10,
                ) / 10,
          count: bucket.count,
        }));

      const commonBlockers = getCommonBlockerWords(
        entries.map((e) => ({
          was_blocked: e.was_blocked,
          blocker_note: e.blocker_note,
        })),
      );

      setTeamData({
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
        })),
        projectStats: {
          total: totalProjects,
          completed,
          abandoned,
          active,
        },
        averages: {
          avgEnergy,
          avgConfidence,
          totalEntries,
          avgEnergyThisMonth,
          avgConfidenceThisMonth,
          totalEntriesThisMonth,
        },
        silentMembers,
        weeklyArc,
        commonBlockers,
      });
      setLoading(false);
    } catch (e) {
      setError(parseSupabaseError(e as any));
      setTeamData(null);
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  return {
    teamData,
    loading,
    error,
    refetch: fetchTeamData,
  };
}

