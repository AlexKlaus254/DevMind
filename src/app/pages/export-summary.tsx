import * as React from "react";
import { useProjects } from "../../hooks/useProjects";
import { useAllJournalEntries } from "../../hooks/useJournal";
import { useInsights } from "../../hooks/useInsights";
import { getSilentDaysForProject } from "../../lib/silenceUtils";
import { computeRiskScore } from "../../lib/riskScore";
import { getCommonBlockerWords } from "../../lib/blockerUtils";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

export function ExportSummary() {
  const { profile, user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { entries, entriesByProject, loading: entriesLoading } = useAllJournalEntries();
  const { growth, totalSilentDays, loading: insightsLoading } = useInsights();
  const loading = projectsLoading || entriesLoading || insightsLoading;
  const [range, setRange] = React.useState<"30" | "all">("30");
  const [copied, setCopied] = React.useState(false);

  const cutOff =
    range === "30"
      ? new Date()
      : new Date(0);
  if (range === "30") {
    cutOff.setDate(cutOff.getDate() - 30);
  }

  const projectsInRange =
    range === "all"
      ? projects
      : projects.filter((p) => {
          const created = p.created_at ?? p.started_at;
          return created && new Date(created) >= cutOff;
        });

  const entriesInRange =
    range === "all"
      ? entries
      : entries.filter((e) => e.created_at && new Date(e.created_at) >= cutOff);

  const started = projectsInRange.length;
  const completed = projectsInRange.filter((p) => p.status === "completed").length;
  const abandoned = projectsInRange.filter((p) => p.status === "abandoned").length;
  const activeInRange = projectsInRange.filter((p) => p.status === "active");
  const avgEnergy =
    entriesInRange.length === 0
      ? 0
      : Math.round(
          (entriesInRange.reduce((s, e) => s + (e.energy_score ?? 0), 0) /
            entriesInRange.length) *
            10,
        ) / 10;
  const avgConfidence =
    entriesInRange.length === 0
      ? 0
      : Math.round(
          (entriesInRange.reduce((s, e) => s + (e.confidence_score ?? 0), 0) /
            entriesInRange.length) *
            10,
        ) / 10;
  const userHistory = {
    total: projects.length,
    abandoned: projects.filter((p) => p.status === "abandoned").length,
  };
  const riskScores = activeInRange.map((p) => ({
    name: p.name,
    risk: computeRiskScore(
      p,
      entriesByProject.get(p.id) ?? [],
      userHistory,
    ).label,
  }));
  const topBlockers = getCommonBlockerWords(entriesInRange).slice(0, 3);
  const displayName = profile?.name ?? user?.user_metadata?.full_name ?? "User";
  const dateRangeLabel =
    range === "30"
      ? `Last 30 days (${cutOff.toLocaleDateString()} - ${new Date().toLocaleDateString()})`
      : "All time";

  const textSummary = [
    `DevMind Accountability Summary`,
    `User: ${displayName}`,
    `Date range: ${dateRangeLabel}`,
    ``,
    `Projects started: ${started}`,
    `Completed: ${completed}`,
    `Abandoned: ${abandoned}`,
    `Average energy score: ${avgEnergy}`,
    `Average confidence score: ${avgConfidence}`,
    `Total journal entries: ${entriesInRange.length}`,
    `Total silent days: ${totalSilentDays}`,
    `Top blocker themes: ${topBlockers.join(", ") || "None"}`,
    `Risk scores (active): ${riskScores.map((r) => `${r.name}: ${r.risk}`).join("; ") || "None"}`,
    `Growth trajectory: ${growth}`,
    ``,
    `This summary was self-reported via DevMind. It reflects the user's own logged data.`,
  ].join("\n");

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 print:max-w-none print:py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-2xl font-semibold">Export your data summary</h1>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="range"
                checked={range === "30"}
                onChange={() => setRange("30")}
                className="rounded"
              />
              Last 30 days
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="range"
                checked={range === "all"}
                onChange={() => setRange("all")}
                className="rounded"
              />
              All time
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? "Copied" : "Copy summary as text"}
            </Button>
            <Button onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4 print:border print:rounded print:bg-white print:shadow-none">
          <div className="print:text-black">
            <div className="text-sm text-muted-foreground print:text-gray-600">
              {displayName} · {dateRangeLabel}
            </div>
            <h2 className="text-lg font-semibold mt-2 print:text-black">
              Summary
            </h2>
          </div>
          <dl className="grid gap-2 text-sm print:text-black">
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Projects started</dt>
              <dd>{started}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Completed</dt>
              <dd>{completed}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Abandoned</dt>
              <dd>{abandoned}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Avg energy</dt>
              <dd>{avgEnergy}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Avg confidence</dt>
              <dd>{avgConfidence}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Journal entries</dt>
              <dd>{entriesInRange.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Total silent days</dt>
              <dd>{totalSilentDays}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Top blocker themes</dt>
              <dd>{topBlockers.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Risk (active projects)</dt>
              <dd>
                {riskScores.length === 0
                  ? "—"
                  : riskScores.map((r) => `${r.name}: ${r.risk}`).join("; ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground print:text-gray-600">Growth trajectory</dt>
              <dd>{growth}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground pt-4 border-t border-border print:text-gray-600">
            This summary was self-reported via DevMind. It reflects the user's own
            logged data.
          </p>
        </div>
      </div>

      <style>{`@media print {
        body { background: white; }
        .print\\:hidden { display: none !important; }
        .print\\:bg-white { background: white; }
        .print\\:text-black { color: black; }
        .print\\:text-gray-600 { color: #4b5563; }
        nav, aside, [data-slot="dialog"] { display: none !important; }
      }`}</style>
    </div>
  );
}
