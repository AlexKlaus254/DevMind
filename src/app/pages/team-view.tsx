import { Users, AlertCircle, BarChart3 } from "lucide-react";
import { StatCard } from "../components/devmind/stat-card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useTeamData } from "../../hooks/useTeamData";

export function TeamView() {
  const { orgId } = useAuth();
  const { teamData, loading, error } = useTeamData(orgId);

  const funnelData =
    teamData != null
      ? [
          {
            label: "Active",
            value: teamData.projectStats.active,
          },
          {
            label: "Completed",
            value: teamData.projectStats.completed,
          },
          {
            label: "Abandoned",
            value: teamData.projectStats.abandoned,
          },
        ]
      : [];

  const completionRate =
    teamData && teamData.projectStats.total > 0
      ? Math.round(
          (teamData.projectStats.completed /
            teamData.projectStats.total) *
            100,
        )
      : 0;

  const hasArc =
    teamData && teamData.weeklyArc.filter((p) => p.count > 0).length >= 3;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header with anonymisation banner */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              All data is anonymised. No individual entries or names are
              visible to managers.
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Team dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Organisation-level patterns only
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && teamData && (
          <>
            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Team size"
                value={teamData.members.length}
                icon={Users}
                subtitle="Members in organisation"
              />
              <StatCard
                title="Completion rate"
                value={
                  teamData.projectStats.total === 0
                    ? "—"
                    : `${completionRate}%`
                }
                icon={BarChart3}
              />
              <StatCard
                title="Active projects"
                value={teamData.projectStats.active}
              />
              <StatCard
                title="Avg energy this month"
                value={teamData.averages.avgEnergyThisMonth}
              />
              <StatCard
                title="Avg confidence this month"
                value={teamData.averages.avgConfidenceThisMonth}
              />
              <StatCard
                title="Silent members (7+ days)"
                value={teamData.silentMembers}
              />
            </div>

            {/* Emotional arc + funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Team emotional arc (last 8 weeks)
                </h3>
                {hasArc ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={teamData.weeklyArc}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#30363D"
                      />
                      <XAxis
                        dataKey="week"
                        stroke="#7D8590"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis
                        stroke="#7D8590"
                        style={{ fontSize: "12px" }}
                        domain={[1, 10]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161B22",
                          border: "1px solid #30363D",
                          borderRadius: 8,
                          color: "#E6EDF3",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgEnergy"
                        stroke="#6C63FF"
                        strokeWidth={2}
                        name="Energy"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgConfidence"
                        stroke="#3FB950"
                        strokeWidth={2}
                        name="Confidence"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Not enough data yet. Chart available after 3 weeks of
                    team activity.
                  </p>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Project status funnel
                </h3>
                {teamData.projectStats.total === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No projects found for this organisation.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={funnelData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#30363D"
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#7D8590"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis
                        stroke="#7D8590"
                        style={{ fontSize: "12px" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161B22",
                          border: "1px solid #30363D",
                          borderRadius: 8,
                          color: "#E6EDF3",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#6C63FF"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Silent members alert */}
            {teamData.silentMembers > 0 && (
              <div className="bg-card border border-amber-500/40 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-100">
                  {teamData.silentMembers} team members have not logged an
                  entry in 7 or more days.
                </p>
              </div>
            )}

            {/* Common blockers */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">
                Common blocker words
              </h3>
              {teamData.commonBlockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No blocker data yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teamData.commonBlockers.slice(0, 5).map((word) => (
                    <span
                      key={word}
                      className="text-xs px-3 py-1 rounded-full border border-border bg-card"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Simple summary insight */}
            <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold mb-2">
                    Team pattern summary
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Completion rate, average scores, and silence counts are
                    computed at the organisation level only. Use this page to
                    track whether the team is drifting or improving over
                    months, not to inspect individuals.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

