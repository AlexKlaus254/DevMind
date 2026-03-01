import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type AiInsightRow =
  Database["public"]["Tables"]["ai_insights"]["Row"];

export function useAiInsight() {
  const { user } = useAuth();
  const [insight, setInsight] = React.useState<AiInsightRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLatest = React.useCallback(async () => {
    if (!user?.id) {
      setInsight(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (err) {
      setError(parseSupabaseError(err));
      setInsight(null);
    } else {
      setInsight((data ?? null) as AiInsightRow | null);
    }
    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  return { insight, loading, error, fetchLatest };
}
