import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError, isSessionExpiredError } from "../lib/errorHandler";
import type { Database } from "../types/database";

const PROJECT_TYPES = ["personal", "work", "freelance", "opensource"];

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectStatus = "active" | "completed" | "paused" | "abandoned";

export type CreateProjectData = {
  name: string;
  description?: string | null;
  type?: string | null;
  is_solo?: boolean;
  has_deadline?: boolean;
  deadline_date?: string | null;
  tech_stack?: string[];
  motivation?: string | null;
  skill_to_improve?: string | null;
  success_definition?: string | null;
  abandonment_risk?: string | null;
};

export function useProjects() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProjects = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) {
        if (isSessionExpiredError(err)) {
          signOut({ sessionExpired: true });
          return;
        }
        setError(parseSupabaseError(err));
        setProjects([]);
      } else {
        setProjects((data ?? []) as ProjectRow[]);
      }
    } catch (e) {
      setError(parseSupabaseError(e as Parameters<typeof parseSupabaseError>[0]));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  React.useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    fetchProjects();
  }, [user, fetchProjects]);

  const createProject = React.useCallback(
    async (data: CreateProjectData): Promise<ProjectRow | null> => {
      if (!user?.id) return null;
      const nameTrim = (data.name ?? "").trim();
      if (!nameTrim) {
        setError("Project name is required.");
        return null;
      }
      if (data.type != null && data.type !== "" && !PROJECT_TYPES.includes(data.type)) {
        setError("Invalid project type.");
        return null;
      }
      setError(null);
      const startedAt = new Date().toISOString();
      const { data: inserted, error: err } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: nameTrim,
          description: data.description ?? null,
          type: data.type ?? null,
          is_solo: data.is_solo ?? true,
          has_deadline: data.has_deadline ?? false,
          deadline_date: data.deadline_date ?? null,
          tech_stack: data.tech_stack ?? null,
          motivation: data.motivation ?? null,
          skill_to_improve: data.skill_to_improve ?? null,
          success_definition: data.success_definition ?? null,
          abandonment_risk: data.abandonment_risk ?? null,
          status: "active",
          started_at: startedAt,
        })
        .select()
        .single();
      if (err) {
        setError(parseSupabaseError(err));
        return null;
      }
      setProjects((prev) => [inserted as ProjectRow, ...prev]);
      return inserted as ProjectRow;
    },
    [user?.id],
  );

  const updateProjectStatus = React.useCallback(
    async (id: string, status: ProjectStatus): Promise<boolean> => {
      setError(null);
      const { error: err } = await supabase
        .from("projects")
        .update({
          status,
          ...(status !== "active"
            ? { ended_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", id);
      if (err) {
        setError(parseSupabaseError(err));
        return false;
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
      return true;
    },
    [],
  );

  const deleteProject = React.useCallback(async (id: string): Promise<boolean> => {
    return updateProjectStatus(id, "abandoned");
  }, [updateProjectStatus]);

  const fetchProject = React.useCallback(
    async (id: string): Promise<ProjectRow | null> => {
      const { data, error: err } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (err || !data) return null;
      return data as ProjectRow;
    },
    [],
  );

  return {
    projects,
    loading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProjectStatus,
    deleteProject,
  };
}
