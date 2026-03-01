import * as React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { ProjectStatusBadge } from "../components/devmind/project-status-badge";
import { Sparkline } from "../components/devmind/sparkline";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { getLastEntryGap } from "../../lib/silenceUtils";
import { computeRiskScore } from "../../lib/riskScore";
import { computeConsistencyScore } from "../../lib/consistencyScore";
import type { ProjectRow, ProjectStatus } from "../../hooks/useProjects";

function ProjectListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg p-6 animate-pulse"
        >
          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-16 mb-4" />
          <div className="h-2 bg-muted rounded w-full mb-2" />
          <div className="h-2 bg-muted rounded w-1/2 mb-4" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export function ProjectList() {
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");
  const { projects, loading, error } = useProjects();
  const { entriesByProject } = useAllJournalEntries();

  const filters: { label: string; value: "all" | ProjectStatus }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Paused", value: "paused" },
    { label: "Abandoned", value: "abandoned" },
  ];

  const filteredProjects =
    filter === "all"
      ? projects
      : projects.filter((p) => p.status === filter);

  const getDaysSinceLastEntry = (project: ProjectRow): number | null => {
    const projectEntries = entriesByProject.get(project.id) ?? [];
    return getLastEntryGap(projectEntries);
  };

  const userHistory = {
    total: projects.length,
    abandoned: projects.filter((p) => p.status === "abandoned").length,
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProjects.length} projects
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/app/compare">Compare projects</Link>
              </Button>
              <Button asChild>
                <Link to="/app/projects/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && <ProjectListSkeleton />}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm mb-6">
            Failed to load projects. Try refreshing.
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const daysSinceLastEntry = getDaysSinceLastEntry(project);
                const status = (project.status ?? "active") as ProjectStatus;
                const progress = 0;
                const moodData: number[] = [];

                return (
                  <Link
                    key={project.id}
                    to={`/app/projects/${project.id}/checkin`}
                  >
                    <div
                      className={`bg-card border rounded-lg p-6 hover:border-primary/50 transition-all ${
                        status === "abandoned" ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {project.name}
                          </h3>
                          {status === "active" && (() => {
                            const risk = computeRiskScore(
                              project,
                              entriesByProject.get(project.id) ?? [],
                              userHistory,
                            );
                            return (
                              <span
                                title={`Risk: ${risk.label}`}
                                className={`shrink-0 w-2 h-2 rounded-full ${
                                  risk.label === "CRITICAL"
                                    ? "bg-destructive animate-pulse"
                                    : risk.label === "HIGH"
                                      ? "bg-destructive/80"
                                      : risk.label === "MODERATE"
                                        ? "bg-amber-500"
                                        : "bg-green-600 dark:bg-green-500"
                                }`}
                              />
                            );
                          })()}
                        </div>
                        <ProjectStatusBadge status={status} />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Progress
                            </span>
                            <span className="font-mono">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        {moodData.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Energy
                              </span>
                            </div>
                            <Sparkline
                              data={moodData}
                              width={240}
                              height={40}
                              color="#6C63FF"
                            />
                          </div>
                        )}

                        <div className="space-y-1 pt-2 border-t border-border">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span
                              className={
                                daysSinceLastEntry != null &&
                                daysSinceLastEntry > 5
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              {daysSinceLastEntry == null
                                ? "No entries yet"
                                : daysSinceLastEntry === 0
                                  ? "Logged today"
                                  : `Last entry: ${daysSinceLastEntry} days ago`}
                            </span>
                          </div>
                          {status === "active" &&
                            (() => {
                              const projEntries = entriesByProject.get(project.id) ?? [];
                              const started =
                                project.started_at ?? project.created_at ?? "";
                              if (!started || projEntries.length === 0) return null;
                              const { score, label } = computeConsistencyScore(
                                projEntries,
                                started,
                              );
                              return (
                                <div className="text-xs text-muted-foreground">
                                  Consistency: {score}% ({label})
                                </div>
                              );
                            })()}
                          {daysSinceLastEntry != null &&
                            daysSinceLastEntry > 10 && (
                              <div className="text-destructive text-xs">
                                This silence is recorded in your pattern data.
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-6">
                  No projects. Create one to start tracking.
                </p>
                <Link to="/app/projects/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create project
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <Link to="/app/projects/new" className="md:hidden">
        <button className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
          <Plus className="w-6 h-6" />
        </button>
      </Link>
    </div>
  );
}
