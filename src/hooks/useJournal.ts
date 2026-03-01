import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type JournalEntryRow =
  Database["public"]["Tables"]["journal_entries"]["Row"];

export type CreateEntryData = {
  energy_score: number;
  confidence_score: number;
  mood_word?: string | null;
  was_blocked: boolean;
  blocker_note?: string | null;
  still_motivated: "yes" | "no" | "unsure" | null;
  reflection?: string | null;
  entry_mode?: "quick" | "deep" | null;
};

export function useJournal(projectId: string | undefined) {
  const { user } = useAuth();
  const [entries, setEntries] = React.useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchEntries = React.useCallback(async () => {
    if (!projectId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (err) {
      setError(parseSupabaseError(err));
      setEntries([]);
      setLoading(false);
      return;
    }
    setEntries((data ?? []) as JournalEntryRow[]);
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId || !user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    fetchEntries();
  }, [projectId, user, fetchEntries]);

  const createEntry = React.useCallback(
    async (
      data: CreateEntryData,
    ): Promise<JournalEntryRow | null> => {
      if (!user?.id || !projectId) return null;
      const energy = data.energy_score ?? 0;
      const confidence = data.confidence_score ?? 0;
      if (energy < 1 || energy > 10) {
        setError("Energy score must be between 1 and 10.");
        return null;
      }
      if (confidence < 1 || confidence > 10) {
        setError("Confidence score must be between 1 and 10.");
        return null;
      }
      setError(null);
      const { data: inserted, error: err } = await supabase
        .from("journal_entries")
        .insert({
          project_id: projectId,
          user_id: user.id,
          energy_score: data.energy_score,
          confidence_score: data.confidence_score,
          mood_word: data.mood_word ?? null,
          was_blocked: data.was_blocked,
          blocker_note: data.blocker_note ?? null,
          still_motivated: data.still_motivated,
          reflection: data.reflection ?? null,
          entry_mode: data.entry_mode ?? "quick",
        })
        .select()
        .single();
      if (err) {
        setError(parseSupabaseError(err));
        return null;
      }
      await fetchEntries();
      return inserted as JournalEntryRow;
    },
    [user?.id, projectId, fetchEntries],
  );

  const updateEntry = React.useCallback(
    async (
      entryId: string,
      data: Partial<CreateEntryData> & { reflection?: string | null },
    ): Promise<boolean> => {
      setError(null);
      const { error: err } = await supabase
        .from("journal_entries")
        .update({
          ...(data.reflection !== undefined && {
            reflection: data.reflection ?? null,
          }),
        })
        .eq("id", entryId);
      if (err) {
        setError(parseSupabaseError(err));
        return false;
      }
      await fetchEntries();
      return true;
    },
    [fetchEntries],
  );

  const getLastEntryDate = React.useCallback(
    (projectIdArg?: string): string | null => {
      const id = projectIdArg ?? projectId;
      if (!id) return null;
      const projectEntries = id === projectId ? entries : [];
      const sorted = [...projectEntries].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
      const last = sorted[0];
      return last?.created_at ?? null;
    },
    [projectId, entries],
  );

  const getSilentDays = React.useCallback(
    (projectIdArg?: string): number | null => {
      const last = getLastEntryDate(projectIdArg);
      if (!last) return null;
      const lastDate = new Date(last);
      lastDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - lastDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    },
    [getLastEntryDate],
  );

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    getLastEntryDate,
    getSilentDays,
  };
}

/**
 * Fetches all journal entries for the current user (for use in project list
 * and dashboard silence metrics).
 */
export function useAllJournalEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = React.useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAll = React.useCallback(async () => {
    if (!user?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      setError(parseSupabaseError(err));
      setEntries([]);
      setLoading(false);
      return;
    }
    setEntries((data ?? []) as JournalEntryRow[]);
    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  return { entries, entriesByProject, loading, error, fetchAll };
}
