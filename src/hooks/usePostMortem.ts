import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type PostMortemRow =
  Database["public"]["Tables"]["project_postmortems"]["Row"];

export type SavePostMortemData = {
  was_rushed: string | null;
  was_overwhelmed: string | null;
  satisfaction_score: number | null;
  scope_changed: boolean | null;
  closing_note: string | null;
};

export function usePostMortem(projectId: string | undefined) {
  const { user } = useAuth();
  const [postMortem, setPostMortem] = React.useState<PostMortemRow | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const getPostMortem = React.useCallback(async () => {
    if (!projectId) {
      setPostMortem(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("project_postmortems")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (err) {
      setError(parseSupabaseError(err));
      setPostMortem(null);
      setLoading(false);
      return;
    }
    setPostMortem((data ?? null) as PostMortemRow | null);
    setLoading(false);
  }, [projectId]);

  React.useEffect(() => {
    getPostMortem();
  }, [getPostMortem]);

  const savePostMortem = React.useCallback(
    async (
      data: SavePostMortemData,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user?.id || !projectId) {
        return { ok: false, error: "Missing user or project." };
      }
      const score = data.satisfaction_score ?? 0;
      if (score !== null && score !== 0 && (score < 1 || score > 5)) {
        const msg = "Satisfaction score must be between 1 and 5.";
        setError(msg);
        return { ok: false, error: msg };
      }
      const note = (data.closing_note ?? "").trim();
      if (!note) {
        const msg = "Closing note is required.";
        setError(msg);
        return { ok: false, error: msg };
      }
      setError(null);
      try {
        const { data: inserted, error: err } = await supabase
          .from("project_postmortems")
          .insert({
            project_id: projectId,
            user_id: user.id,
            was_rushed: data.was_rushed,
            was_overwhelmed: data.was_overwhelmed,
            satisfaction_score: data.satisfaction_score,
            scope_changed: data.scope_changed,
            closing_note: data.closing_note,
          })
          .select()
          .single();
        if (err) {
          const msg = parseSupabaseError(err);
          setError(msg);
          return { ok: false, error: msg };
        }
        setPostMortem(inserted as PostMortemRow);
        return { ok: true };
      } catch (e) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : "Failed to save post-mortem.";
        setError(msg);
        return { ok: false, error: msg };
      }
    },
    [user?.id, projectId],
  );

  return {
    postMortem,
    loading,
    error,
    savePostMortem,
    getPostMortem,
  };
}
