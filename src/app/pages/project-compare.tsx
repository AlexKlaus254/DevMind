import * as React from "react";
import { Link } from "react-router";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { usePostMortem } from "../../hooks/usePostMortem";
import { computeRiskScore } from "../../lib/riskScore";
import { computeConsistencyScore } from "../../lib/consistencyScore";
import { getBlockerFrequency } from "../../lib/blockerUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

function ProjectColumn({
  projectId,
  projects,
  entriesByProject,
  satisfactionScore,
}: {
  projectId: string | null;
  projects: { id: string; name: string; status: string | null; started_at: string | null; created_at: string | null; ended_at: string | null }[];
  entriesByProject: Map<string, { energy_score?: number | null; confidence_score?: number | null; was_blocked?: boolean | null; created_at: string | null }[]>;
  satisfactionScore: number | null;
}) {
  if (!projectId) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
        Select a project
      </div>
    );
  }
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  const entries = entriesByProject.get(projectId) ?? [];
  const started = project.started_at ?? project.created_at ?? "";
  const ended = project.ended_at ? new Date(project.ended_at) : new Date();
  const startDate = project.started_at ? new Date(project.started_at) : new Date(project.created_at ?? 0);
  const durationDays = Math.max(
    0,
    Math.floor((ended.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const consistency = computeConsistencyScore(entries, started || new Date().toISOString());
  const avgEnergy =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + (e.energy_score ?? 0), 0) / entries.length) * 10,
        ) / 10;
  const avgConfidence =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + (e.confidence_score ?? 0), 0) / entries.length) * 10,
        ) / 10;
  const blocker = getBlockerFrequency(entries);
  const userHistory = {
    total: projects.length,
    abandoned: projects.filter((p) => p.status === "abandoned").length,
  };
  const risk = computeRiskScore(project, entries, userHistory);
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold truncate">{project.name}</h3>
        <span className="text-xs capitalize text-muted-foreground">{project.status}</span>
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Duration</dt>
          <dd>{durationDays} days</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Consistency</dt>
          <dd>{consistency.score}% ({consistency.label})</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Avg energy</dt>
          <dd>{avgEnergy}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Avg confidence</dt>
          <dd>{avgConfidence}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Blocker rate</dt>
          <dd>{blocker.percentage}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Risk</dt>
          <dd>{risk.label}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Outcome</dt>
          <dd className="capitalize">{project.status ?? "—"}</dd>
        </div>
        {satisfactionScore != null && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Post-mortem satisfaction</dt>
            <dd>{satisfactionScore}/5</dd>
          </div>
        )}
      </dl>
      <Link
        to={`/app/projects/${projectId}`}
        className="text-sm text-primary hover:underline block"
      >
        View project
      </Link>
    </div>
  );
}

export function ProjectCompare() {
  const { projects, loading } = useProjects();
  const { entriesByProject } = useAllJournalEntries();
  const [leftId, setLeftId] = React.useState<string | null>(null);
  const [rightId, setRightId] = React.useState<string | null>(null);
  const leftPostMortem = usePostMortem(leftId ?? undefined);
  const rightPostMortem = usePostMortem(rightId ?? undefined);

  const leftProject = leftId ? projects.find((p) => p.id === leftId) : null;
  const rightProject = rightId ? projects.find((p) => p.id === rightId) : null;
  const leftEntries = leftId ? entriesByProject.get(leftId) ?? [] : [];
  const rightEntries = rightId ? entriesByProject.get(rightId) ?? [] : [];

  const leftAvgConf = leftEntries.length
    ? leftEntries.reduce((s, e) => s + (e.confidence_score ?? 0), 0) / leftEntries.length
    : 0;
  const rightAvgConf = rightEntries.length
    ? rightEntries.reduce((s, e) => s + (e.confidence_score ?? 0), 0) / rightEntries.length
    : 0;
  const leftHasDeadline = leftProject?.has_deadline === true || (leftProject?.deadline_date != null && leftProject.deadline_date !== "");
  const rightHasDeadline = rightProject?.has_deadline === true || (rightProject?.deadline_date != null && rightProject.deadline_date !== "");
  const leftBlockerCount = leftEntries.filter((e) => e.was_blocked).length;
  const rightBlockerCount = rightEntries.filter((e) => e.was_blocked).length;

  const differenceLines: string[] = [];
  if (leftProject && rightProject) {
    if (leftAvgConf > rightAvgConf + 0.5) {
      differenceLines.push(
        `The completed project had a higher average confidence score (${leftAvgConf.toFixed(1)} vs ${rightAvgConf.toFixed(1)}).`,
      );
    } else if (rightAvgConf > leftAvgConf + 0.5) {
      differenceLines.push(
        `The completed project had a higher average confidence score (${rightAvgConf.toFixed(1)} vs ${leftAvgConf.toFixed(1)}).`,
      );
    }
    if (leftHasDeadline && !rightHasDeadline) {
      differenceLines.push("The first project had a set deadline; the second did not.");
    } else if (!leftHasDeadline && rightHasDeadline) {
      differenceLines.push("The second project had a set deadline; the first did not.");
    }
    const leftTotal = leftEntries.length;
    const rightTotal = rightEntries.length;
    if (rightTotal > 0 && leftBlockerCount > rightBlockerCount * 2) {
      differenceLines.push(
        `The first project had more than 2x blocker reports (${leftBlockerCount} vs ${rightBlockerCount}).`,
      );
    } else if (leftTotal > 0 && rightBlockerCount > leftBlockerCount * 2) {
      differenceLines.push(
        `The second project had more than 2x blocker reports (${rightBlockerCount} vs ${leftBlockerCount}).`,
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Compare projects</h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link to="/app/projects" className="text-sm text-muted-foreground hover:text-foreground">
              Back to projects
            </Link>
            <h1 className="text-2xl font-semibold">Compare projects</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project A</label>
            <Select
              value={leftId ?? ""}
              onValueChange={(v) => setLeftId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Project B</label>
            <Select
              value={rightId ?? ""}
              onValueChange={(v) => setRightId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProjectColumn
            projectId={leftId}
            projects={projects}
            entriesByProject={entriesByProject}
            satisfactionScore={leftPostMortem.postMortem?.satisfaction_score ?? null}
          />
          <ProjectColumn
            projectId={rightId}
            projects={projects}
            entriesByProject={entriesByProject}
            satisfactionScore={rightPostMortem.postMortem?.satisfaction_score ?? null}
          />
        </div>

        {differenceLines.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Difference summary</h3>
            <p className="text-sm text-muted-foreground">
              {differenceLines.join(" ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
