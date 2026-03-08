import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";
import { getCommonBlockerWords } from "../lib/blockerUtils";
import { getISOWeek, getISOWeekYear } from "date-fns";

type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type JournalEntryRow =
  Database["public"]["Tables"]["journal_entries"]["Row"];
type DailyTaskRow = Database["public"]["Tables"]["daily_tasks"]["Row"];
type OrgSettingsRow = Database["public"]["Tables"]["org_settings"]["Row"];
type OrgInviteRow = Database["public"]["Tables"]["org_invites"]["Row"];

export type OrgDetails = {
  name: string;
  created_at: string | null;
  memberCount: number;
};

export type TeamMember = Pick<
  ProfileRow,
  "id" | "name" | "role" | "joined_org_at"
>;

export type TeamInvite = OrgInviteRow;

export type ProjectStats = {
  total: number;
  completed: number;
  abandoned: number;
  active: number;
  completion_rate: number;
};

export type JournalStats = {
  avg_energy: number;
  avg_confidence: number;
  total_entries: number;
  active_journalers: number;
};

export type TaskStats = {
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
};

export type WeeklyTrendPoint = {
  week_start: string;
  avg_energy: number;
  avg_confidence: number;
  entry_count: number;
};

export type TeamAggregates = {
  projectStats: ProjectStats;
  journalStats: JournalStats;
  silentMembers: number;
  taskStats: TaskStats;
  weeklyTrend: WeeklyTrendPoint[];
  commonBlockers: string[];
};

export type OrgSettingsInput = Partial<
  Pick<
    OrgSettingsRow,
    "weekly_digest_enabled" | "digest_day" | "digest_time" | "silence_alert_days"
  >
>;

export function useTeam() {
  const { user, orgId } = useAuth();

  const [orgDetails, setOrgDetails] = React.useState<OrgDetails | null>(null);
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [invites, setInvites] = React.useState<TeamInvite[]>([]);
  const [aggregates, setAggregates] = React.useState<TeamAggregates | null>(
    null,
  );
  const [orgSettings, setOrgSettings] =
    React.useState<OrgSettingsRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOrgDetails = React.useCallback(async () => {
    if (!orgId) {
      setOrgDetails(null);
      return;
    }
    try {
      const [{ data: orgRaw, error: orgErr }, { data: membersRaw, error: mErr }] =
        await Promise.all([
          supabase
            .from("organisations")
            .select("*")
            .eq("id", orgId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id")
            .eq("org_id", orgId),
        ]);

      if (orgErr) throw orgErr;
      if (mErr) throw mErr;

      const org = orgRaw as OrganisationRow | null;
      const count = (membersRaw ?? []).length;
      if (!org) {
        setOrgDetails(null);
        return;
      }
      setOrgDetails({
        name: org.name,
        created_at: org.created_at,
        memberCount: count,
      });
    } catch (e) {
      setError(parseSupabaseError(e as any));
    }
  }, [orgId]);

  const fetchTeamMembers = React.useCallback(async () => {
    if (!orgId) {
      setMembers([]);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id,name,role,joined_org_at")
        .eq("org_id", orgId)
        .order("joined_org_at", { ascending: false });
      if (err) throw err;
      const rows = (data ?? []) as ProfileRow[];
      setMembers(
        rows.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          joined_org_at: m.joined_org_at,
        })),
      );
    } catch (e) {
      setError(parseSupabaseError(e as any));
      setMembers([]);
    }
  }, [orgId]);

  const fetchActiveInvites = React.useCallback(async () => {
    if (!orgId) {
      setInvites([]);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from("org_invites")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (err) throw err;
      const now = new Date();
      const rows = (data ?? []) as OrgInviteRow[];
      const filtered = rows.filter((inv) => {
        if (!inv.is_active) return false;
        if (!inv.expires_at) return true;
        const exp = new Date(inv.expires_at);
        return exp.getTime() > now.getTime();
      });
      setInvites(filtered);
    } catch (e) {
      setError(parseSupabaseError(e as any));
      setInvites([]);
    }
  }, [orgId]);

  const generateInviteCode = React.useCallback(async (): Promise<string | null> => {
    if (!orgId || !user?.id) return null;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const makeCode = () => {
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    setError(null);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      try {
        const { data, error: err } = await supabase
          .from("org_invites")
          .insert({
            org_id: orgId,
            created_by: user.id,
            code,
          })
          .select()
          .single();
        if (err) {
          // If unique constraint violated, try again with a new code.
          if ((err as any).code === "23505") {
            continue;
          }
          throw err;
        }
        const row = data as OrgInviteRow;
        setInvites((prev) => [row, ...prev]);
        return code;
      } catch (e) {
        setError(parseSupabaseError(e as any));
        return null;
      }
    }
    return null;
  }, [orgId, user?.id]);

  const deactivateInvite = React.useCallback(
    async (inviteId: string): Promise<boolean> => {
      setError(null);
      try {
        const { error: err } = await supabase
          .from("org_invites")
          .update({ is_active: false })
          .eq("id", inviteId);
        if (err) throw err;
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        return true;
      } catch (e) {
        setError(parseSupabaseError(e as any));
        return false;
      }
    },
    [],
  );

  const removeTeamMember = React.useCallback(
    async (memberId: string): Promise<boolean> => {
      setError(null);
      try {
        const { error: err } = await supabase
          .from("profiles")
          .update({
            org_id: null,
            role: "solo",
          })
          .eq("id", memberId);
        if (err) throw err;
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setOrgDetails((prev) =>
          prev
            ? {
                ...prev,
                memberCount: Math.max(0, prev.memberCount - 1),
              }
            : prev,
        );
        return true;
      } catch (e) {
        setError(parseSupabaseError(e as any));
        return false;
      }
    },
    [],
  );

  const fetchOrgSettings = React.useCallback(async () => {
    if (!orgId) {
      setOrgSettings(null);
      return;
    }
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("org_settings")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();
      if (err) throw err;
      if (data) {
        setOrgSettings(data as OrgSettingsRow);
        return;
      }
      const { data: inserted, error: insertErr } = await supabase
        .from("org_settings")
        .insert({
          org_id: orgId,
          weekly_digest_enabled: true,
          digest_day: "monday",
          digest_time: "09:00",
          silence_alert_days: 7,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      setOrgSettings(inserted as OrgSettingsRow);
    } catch (e) {
      setError(parseSupabaseError(e as any));
      setOrgSettings(null);
    }
  }, [orgId]);

  const saveOrgSettings = React.useCallback(
    async (input: OrgSettingsInput): Promise<boolean> => {
      if (!orgId) return false;
      setError(null);
      try {
        const current = orgSettings;
        const payload = {
          org_id: orgId,
          weekly_digest_enabled:
            input.weekly_digest_enabled ??
            current?.weekly_digest_enabled ??
            true,
          digest_day: input.digest_day ?? current?.digest_day ?? "monday",
          digest_time: input.digest_time ?? current?.digest_time ?? "09:00",
          silence_alert_days:
            input.silence_alert_days ?? current?.silence_alert_days ?? 7,
          updated_at: new Date().toISOString(),
        };
        const { data, error: err } = await supabase
          .from("org_settings")
          .upsert(payload, { onConflict: "org_id" })
          .select()
          .single();
        if (err) throw err;
        setOrgSettings(data as OrgSettingsRow);
        return true;
      } catch (e) {
        setError(parseSupabaseError(e as any));
        return false;
      }
    },
    [orgId, orgSettings],
  );

  const updateOrgName = React.useCallback(
    async (name: string): Promise<boolean> => {
      if (!orgId) return false;
      setError(null);
      try {
        const { error: err } = await supabase
          .from("organisations")
          .update({ name: name.trim() })
          .eq("id", orgId);
        if (err) throw err;
        setOrgDetails((prev) =>
          prev
            ? {
                ...prev,
                name: name.trim(),
              }
            : prev,
        );
        return true;
      } catch (e) {
        setError(parseSupabaseError(e as any));
        return false;
      }
    },
    [orgId],
  );

  const fetchTeamAggregates = React.useCallback(
    async (targetOrgId?: string) => {
      const effectiveOrgId = targetOrgId ?? orgId;
      if (!effectiveOrgId) {
        setAggregates(null);
        return;
      }
      setError(null);

      try {
        const { data: membersRaw, error: membersErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("org_id", effectiveOrgId)
          .eq("role", "member");
        if (membersErr) throw membersErr;
        const memberIds = (membersRaw ?? []).map((m) => (m as ProfileRow).id);
        if (memberIds.length === 0) {
          setAggregates({
            projectStats: {
              total: 0,
              completed: 0,
              abandoned: 0,
              active: 0,
              completion_rate: 0,
            },
            journalStats: {
              avg_energy: 0,
              avg_confidence: 0,
              total_entries: 0,
              active_journalers: 0,
            },
            silentMembers: 0,
            taskStats: {
              total_tasks: 0,
              completed_tasks: 0,
              task_completion_rate: 0,
            },
            weeklyTrend: [],
            commonBlockers: [],
          });
          return;
        }

        const [projectsRes, entriesRes, tasksRes] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .in("user_id", memberIds),
          supabase
            .from("journal_entries")
            .select("*")
            .in("user_id", memberIds),
          (() => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7);
            const cutoffIso = cutoff.toISOString().slice(0, 10);
            return supabase
              .from("daily_tasks")
              .select("*")
              .in("user_id", memberIds)
              .gte("planned_date", cutoffIso);
          })(),
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (entriesRes.error) throw entriesRes.error;
        if (tasksRes.error) throw tasksRes.error;

        const projects = (projectsRes.data ?? []) as ProjectRow[];
        const entries = (entriesRes.data ?? []) as JournalEntryRow[];
        const tasks = (tasksRes.data ?? []) as DailyTaskRow[];

        // Project stats
        const totalProjects = projects.length;
        const completedProjects = projects.filter(
          (p) => p.status === "completed",
        ).length;
        const abandonedProjects = projects.filter(
          (p) => p.status === "abandoned",
        ).length;
        const activeProjects = projects.filter(
          (p) => p.status === "active",
        ).length;
        const completion_rate =
          totalProjects === 0
            ? 0
            : Math.round((completedProjects * 1000) / totalProjects) / 10;

        // Journal stats (last 30 days)
        const cutoff30 = new Date();
        cutoff30.setDate(cutoff30.getDate() - 30);
        const entriesLast30 = entries.filter((e) => {
          if (!e.created_at) return false;
          const d = new Date(e.created_at);
          return d.getTime() > cutoff30.getTime();
        });
        const totalEntriesLast30 = entriesLast30.length;

        const avg_energy =
          totalEntriesLast30 === 0
            ? 0
            : Math.round(
                (entriesLast30.reduce(
                  (sum, e) => sum + (e.energy_score ?? 0),
                  0,
                ) /
                  totalEntriesLast30) *
                  10,
              ) / 10;
        const avg_confidence =
          totalEntriesLast30 === 0
            ? 0
            : Math.round(
                (entriesLast30.reduce(
                  (sum, e) => sum + (e.confidence_score ?? 0),
                  0,
                ) /
                  totalEntriesLast30) *
                  10,
              ) / 10;
        const activeJournalers = new Set(
          entriesLast30
            .map((e) => e.user_id)
            .filter((id): id is string => !!id),
        ).size;

        // Silent members count based on org_settings.silence_alert_days
        const thresholdDays =
          orgSettings?.silence_alert_days != null
            ? orgSettings.silence_alert_days
            : 7;
        const thresholdMs = (thresholdDays ?? 7) * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const entriesByUser = new Map<string, string[]>();
        for (const e of entries) {
          if (!e.user_id || !e.created_at) continue;
          const list = entriesByUser.get(e.user_id) ?? [];
          list.push(e.created_at);
          entriesByUser.set(e.user_id, list);
        }
        let silentMembers = 0;
        for (const id of memberIds) {
          const list = entriesByUser.get(id) ?? [];
          if (list.length === 0) {
            silentMembers += 1;
            continue;
          }
          const last = list
            .map((d) => new Date(d).getTime())
            .sort((a, b) => b - a)[0];
          if (nowMs - last > thresholdMs) {
            silentMembers += 1;
          }
        }

        // Task completion aggregate (last 7 days)
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t) => t.status === "completed",
        ).length;
        const task_completion_rate =
          totalTasks === 0
            ? 0
            : Math.round((completedTasks * 1000) / totalTasks) / 10;

        // Weekly trend (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 8);
        const buckets = new Map<
          string,
          { sumEnergy: number; sumConfidence: number; count: number; earliest: Date }
        >();

        for (const e of entries) {
          if (!e.created_at) continue;
          const d = new Date(e.created_at);
          if (d.getTime() < eightWeeksAgo.getTime()) continue;
          const key = `${getISOWeekYear(d)}-W${getISOWeek(d)
            .toString()
            .padStart(2, "0")}`;
          const existing =
            buckets.get(key) ??
            {
              sumEnergy: 0,
              sumConfidence: 0,
              count: 0,
              earliest: d,
            };
          existing.sumEnergy += e.energy_score ?? 0;
          existing.sumConfidence += e.confidence_score ?? 0;
          existing.count += 1;
          if (d < existing.earliest) existing.earliest = d;
          buckets.set(key, existing);
        }

        const weeklyTrend: WeeklyTrendPoint[] = Array.from(
          buckets.entries(),
        )
          .sort((a, b) => a[1].earliest.getTime() - b[1].earliest.getTime())
          .map(([_, bucket]) => ({
            week_start: bucket.earliest.toISOString().slice(0, 10),
            avg_energy:
              bucket.count === 0
                ? 0
                : Math.round(
                    (bucket.sumEnergy / bucket.count) * 10,
                  ) / 10,
            avg_confidence:
              bucket.count === 0
                ? 0
                : Math.round(
                    (bucket.sumConfidence / bucket.count) * 10,
                  ) / 10,
            entry_count: bucket.count,
          }));

        // Common blockers (top 5 words, anonymised)
        const commonBlockers = getCommonBlockerWords(
          entries.map((e) => ({
            was_blocked: e.was_blocked,
            blocker_note: e.blocker_note,
          })),
        );

        setAggregates({
          projectStats: {
            total: totalProjects,
            completed: completedProjects,
            abandoned: abandonedProjects,
            active: activeProjects,
            completion_rate,
          },
          journalStats: {
            avg_energy,
            avg_confidence,
            total_entries: totalEntriesLast30,
            active_journalers: activeJournalers,
          },
          silentMembers,
          taskStats: {
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            task_completion_rate,
          },
          weeklyTrend,
          commonBlockers,
        });
      } catch (e) {
        setError(parseSupabaseError(e as any));
        setAggregates(null);
      }
    },
    [orgId, orgSettings],
  );

  React.useEffect(() => {
    if (!orgId) {
      setOrgDetails(null);
      setMembers([]);
      setInvites([]);
      setAggregates(null);
      setOrgSettings(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchOrgDetails(),
        fetchTeamMembers(),
        fetchOrgSettings(),
        fetchActiveInvites(),
      ]);
      await fetchTeamAggregates(orgId);
      if (!cancelled) {
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    orgId,
    fetchOrgDetails,
    fetchTeamMembers,
    fetchOrgSettings,
    fetchActiveInvites,
    fetchTeamAggregates,
  ]);

  return {
    orgDetails,
    members,
    invites,
    aggregates,
    orgSettings,
    loading,
    error,
    fetchOrgDetails,
    fetchTeamMembers,
    generateInviteCode,
    fetchActiveInvites,
    deactivateInvite,
    removeTeamMember,
    fetchTeamAggregates,
    fetchOrgSettings,
    saveOrgSettings,
    updateOrgName,
  };
}

