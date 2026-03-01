import * as React from "react";
import { Link } from "react-router";
import { BookOpen, Plus, PenLine, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { getLastEntryGap } from "../../lib/silenceUtils";

export function Journal() {
  const { projects, loading, error } = useProjects();
  const { entriesByProject } = useAllJournalEntries();
  const activeProjects = projects.filter((p) => p.status === "active");

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Journal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log a check-in for a project
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Journal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log a check-in for a project
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            Failed to load projects. Try refreshing.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log a check-in for a project
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {activeProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              No active projects. Start a project to begin journaling.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/app/projects/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create project
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/projects">View all projects</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeProjects.map((p) => {
              const projectEntries = entriesByProject.get(p.id) ?? [];
              const gap = getLastEntryGap(projectEntries);
              const daysActive =
                p.started_at != null
                  ? Math.floor(
                      (Date.now() - new Date(p.started_at).getTime()) /
                        (1000 * 60 * 60 * 24),
                    ) + 1
                  : 0;
              return (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-lg p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-lg">{p.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {daysActive} days active
                        {gap != null ? (
                          <span
                            className={
                              gap > 5 ? "text-destructive ml-1" : undefined
                            }
                          >
                            {" · Last entry "}
                            {gap === 0 ? "today" : `${gap} days ago`}
                          </span>
                        ) : (
                          " · No entries yet"
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/app/projects/${p.id}/checkin`}>
                          <PenLine className="w-4 h-4 mr-2" />
                          Log entry
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/app/projects/${p.id}/reflection`}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Deep reflection
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
