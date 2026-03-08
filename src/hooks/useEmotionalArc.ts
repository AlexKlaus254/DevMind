import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";

export type EmotionalArcPoint = {
  date: string;
  energy: number;
  confidence: number;
};

export function useEmotionalArc(projectId?: string) {
  const { user } = useAuth();
  const [arcData, setArcData] = React.useState<EmotionalArcPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchArc = React.useCallback(async () => {
    if (!user?.id) {
      setArcData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("journal_entries")
      .select("energy_score, confidence_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(parseSupabaseError(err));
      setArcData([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as {
      energy_score: number | null;
      confidence_score: number | null;
      created_at: string | null;
    }[];

    const mapped: EmotionalArcPoint[] = rows
      .filter((r) => r.created_at != null)
      .map((r) => {
        const d = new Date(r.created_at as string);
        const dateLabel = d.toLocaleDateString(undefined, {
          month: "short",
          day: "2-digit",
        });
        return {
          date: dateLabel,
          energy: r.energy_score ?? 0,
          confidence: r.confidence_score ?? 0,
        };
      });

    setArcData(mapped);
    setLoading(false);
  }, [user?.id, projectId]);

  React.useEffect(() => {
    fetchArc();
  }, [fetchArc]);

  return { arcData, loading, error, refetch: fetchArc };
}

