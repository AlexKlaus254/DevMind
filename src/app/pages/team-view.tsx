import * as React from "react";
import {
  Users,
  AlertCircle,
  BarChart3,
  Mail,
  Clock,
  Shield,
} from "lucide-react";
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
import { useTeam } from "../../hooks/useTeam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Progress } from "../components/ui/progress";
import { RoleGuard } from "../components/RoleGuard";

export function TeamView() {
  const { role, profile, orgId } = useAuth();
  const {
    orgDetails,
    members,
    invites,
    aggregates,
    orgSettings,
    loading,
    error,
    generateInviteCode,
    deactivateInvite,
    removeTeamMember,
    saveOrgSettings,
    updateOrgName,
  } = useTeam();

  const [activeTab, setActiveTab] = React.useState<"overview" | "members" | "invites" | "settings">("overview");
  const [latestInviteCode, setLatestInviteCode] = React.useState<string | null>(
    null,
  );
  const [orgNameDraft, setOrgNameDraft] = React.useState<string>("");
  const [settingsDraft, setSettingsDraft] = React.useState<{
    weeklyDigestEnabled: boolean;
    digestDay: string;
    digestTime: string;
    silenceAlertDays: number;
  } | null>(null);
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied">(
    "idle",
  );

  React.useEffect(() => {
    if (orgDetails && !orgNameDraft) {
      setOrgNameDraft(orgDetails.name);
    }
  }, [orgDetails, orgNameDraft]);

  React.useEffect(() => {
    if (!settingsDraft && orgSettings) {
      setSettingsDraft({
        weeklyDigestEnabled:
          orgSettings.weekly_digest_enabled ?? true,
        digestDay: orgSettings.digest_day ?? "monday",
        digestTime: orgSettings.digest_time ?? "09:00",
        silenceAlertDays: orgSettings.silence_alert_days ?? 7,
      });
    }
  }, [orgSettings, settingsDraft]);

  const handleGenerateInvite = async () => {
    const code = await generateInviteCode();
    if (code) {
      setLatestInviteCode(code);
      setCopyStatus("idle");
    }
  };

  const handleCopyCode = async () => {
    if (!latestInviteCode) return;
    try {
      await navigator.clipboard.writeText(latestInviteCode);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      setCopyStatus("idle");
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft || !orgNameDraft.trim()) return;
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      const [nameOk, settingsOk] = await Promise.all([
        updateOrgName(orgNameDraft.trim()),
        saveOrgSettings({
          weekly_digest_enabled: settingsDraft.weeklyDigestEnabled,
          digest_day: settingsDraft.digestDay,
          digest_time: settingsDraft.digestTime,
          silence_alert_days: settingsDraft.silenceAlertDays,
        }),
      ]);
      if (!nameOk || !settingsOk) {
        setSettingsError("Failed to save organisation settings.");
      } else {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!orgId) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-semibold mb-2">Team</h1>
          <p className="text-sm text-muted-foreground">
            You are not part of an organisation yet.
          </p>
        </div>
      </div>
    );
  }

  if (role !== "manager") {
    const orgName = orgDetails?.name ?? "Organisation";
    const joined =
      profile?.joined_org_at ??
      profile?.created_at ??
      null;
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Your organisation</h1>
                <p className="text-sm text-muted-foreground">
                  Read-only team information
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <p className="text-sm">
              You are a member of <span className="font-semibold">{orgName}</span>.
            </p>
            {joined && (
              <p className="text-sm text-muted-foreground">
                Member since{" "}
                {new Date(joined).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
                .
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Your personal data is private. Managers see only anonymised team
              metrics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRole="manager">
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="bg-primary/10 border-b border-primary/30 px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                All metrics are anonymised. No individual entries, reflections, or
                names are visible to managers.
              </span>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Team</h1>
                  <p className="text-sm text-muted-foreground">
                    Organisation-level patterns and management
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as "overview" | "members" | "invites" | "settings")
            }
          >
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invites">Invites</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewTab
                orgDetails={orgDetails}
                aggregates={aggregates}
                orgSettings={orgSettings}
              />
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
              <MembersTab
                members={members}
                memberToRemove={memberToRemove}
                setMemberToRemove={setMemberToRemove}
                removeTeamMember={removeTeamMember}
              />
            </TabsContent>

            <TabsContent value="invites" className="space-y-6">
              <InvitesTab
                latestInviteCode={latestInviteCode}
                copyStatus={copyStatus}
                onGenerate={handleGenerateInvite}
                onCopy={handleCopyCode}
                invites={invites}
                deactivateInvite={deactivateInvite}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <SettingsTab
                orgDetails={orgDetails}
                orgNameDraft={orgNameDraft}
                setOrgNameDraft={setOrgNameDraft}
                settingsDraft={settingsDraft}
                setSettingsDraft={setSettingsDraft}
                onSave={handleSaveSettings}
                saving={settingsSaving}
                saved={settingsSaved}
                error={settingsError}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RoleGuard>
  );
}

function OverviewTab({
  orgDetails,
  aggregates,
  orgSettings,
}: {
  orgDetails: ReturnType<typeof useTeam>["orgDetails"];
  aggregates: ReturnType<typeof useTeam>["aggregates"];
  orgSettings: ReturnType<typeof useTeam>["orgSettings"];
}) {
  if (!aggregates) {
    return (
      <p className="text-sm text-muted-foreground">
        No team data available yet.
      </p>
    );
  }

  const teamSize = orgDetails?.memberCount ?? 0;
  const completionRate = aggregates.projectStats.completion_rate;
  const avgEnergy = aggregates.journalStats.avg_energy;
  const avgConfidence = aggregates.journalStats.avg_confidence;
  const silentMembers = aggregates.silentMembers;
  const totalMembers = teamSize || Math.max(teamSize, silentMembers);
  const silentRatio =
    totalMembers === 0 ? 0 : Math.round((silentMembers * 1000) / totalMembers) / 10;
  const taskCompletionRate = aggregates.taskStats.task_completion_rate;

  const completionConcern = completionRate < 40;
  const energyConcern = avgEnergy < 4;
  const silentConcern = silentRatio > 20;

  const funnelData = [
    { label: "Active", value: aggregates.projectStats.active },
    { label: "Completed", value: aggregates.projectStats.completed },
    { label: "Abandoned", value: aggregates.projectStats.abandoned },
  ];

  const hasTrend = aggregates.weeklyTrend.length >= 2;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Team size"
          value={teamSize}
          icon={Users}
          subtitle="Members in organisation"
        />
        <StatCard
          title="Completion rate"
          value={
            aggregates.projectStats.total === 0
              ? "—"
              : `${completionRate.toFixed(1)}%`
          }
          icon={BarChart3}
          className={
            completionConcern ? "border-destructive/30 text-destructive/80" : undefined
          }
        />
        <StatCard
          title="Avg energy (30 days)"
          value={avgEnergy.toFixed(1)}
          className={energyConcern ? "border-destructive/30 text-destructive/80" : undefined}
        />
        <StatCard
          title="Avg confidence (30 days)"
          value={avgConfidence.toFixed(1)}
        />
        <StatCard
          title="Silent members"
          value={silentMembers}
          subtitle={
            totalMembers > 0 ? `${silentRatio.toFixed(1)}% of team` : undefined
          }
          className={silentConcern ? "border-destructive/30 text-destructive/80" : undefined}
        />
        <StatCard
          title="Task completion (7 days)"
          value={
            aggregates.taskStats.total_tasks === 0
              ? "—"
              : `${taskCompletionRate.toFixed(1)}%`
          }
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Task completion (7 days)</h3>
          <span className="text-sm font-mono text-muted-foreground">
            {aggregates.taskStats.total_tasks === 0
              ? "—"
              : `${taskCompletionRate.toFixed(1)}%`}
          </span>
        </div>
        <Progress
          value={aggregates.taskStats.total_tasks === 0 ? 0 : taskCompletionRate}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground">
          {aggregates.taskStats.completed_tasks} of {aggregates.taskStats.total_tasks} tasks completed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Weekly trend (energy and confidence)
          </h3>
          {hasTrend ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={aggregates.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis
                  dataKey="week_start"
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
                  dataKey="avg_energy"
                  stroke="#6C63FF"
                  strokeWidth={2}
                  name="Energy"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avg_confidence"
                  stroke="#3FB950"
                  strokeWidth={2}
                  name="Confidence"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Insufficient data. Chart available after 2 weeks of team activity.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Project status funnel</h3>
          {aggregates.projectStats.total === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No projects found for this organisation.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
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

      {silentMembers > 0 && (
        <div className="bg-card border border-amber-500/40 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-100">
            [{silentMembers}] member(s) have not logged in{" "}
            {(orgSettings?.silence_alert_days ?? 7) ?? 7} or more days.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">
          Common blockers across team
        </h3>
        {aggregates.commonBlockers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blocker data yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {aggregates.commonBlockers.slice(0, 5).map((word) => (
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
    </div>
  );
}

function MembersTab({
  members,
  memberToRemove,
  setMemberToRemove,
  removeTeamMember,
}: {
  members: ReturnType<typeof useTeam>["members"];
  memberToRemove: { id: string; name: string | null } | null;
  setMemberToRemove: (
    v: { id: string; name: string | null } | null,
  ) => void;
  removeTeamMember: (id: string) => Promise<boolean>;
}) {
  const [removing, setRemoving] = React.useState(false);

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    await removeTeamMember(memberToRemove.id);
    setRemoving(false);
    setMemberToRemove(null);
  };

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No members yet. Generate an invite code.
        </p>
      ) : (
        <div className="bg-card border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name ?? "Unnamed"}</TableCell>
                  <TableCell className="capitalize">
                    {m.role ?? "member"}
                  </TableCell>
                  <TableCell>
                    {m.joined_org_at
                      ? new Date(m.joined_org_at).toLocaleDateString(
                          undefined,
                          { dateStyle: "medium" },
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMemberToRemove({ id: m.id, name: m.name })
                      }
                    >
                      Remove from team
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-semibold">
              Remove {memberToRemove.name ?? "this member"} from team?
            </h2>
            <p className="text-sm text-muted-foreground">
              They will keep their personal data but lose access to team
              features.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberToRemove(null)}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmRemove}
                disabled={removing}
              >
                {removing ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvitesTab({
  latestInviteCode,
  copyStatus,
  onGenerate,
  onCopy,
  invites,
  deactivateInvite,
}: {
  latestInviteCode: string | null;
  copyStatus: "idle" | "copied";
  onGenerate: () => Promise<void>;
  onCopy: () => Promise<void>;
  invites: ReturnType<typeof useTeam>["invites"];
  deactivateInvite: (id: string) => Promise<boolean>;
}) {
  const [deactivatingId, setDeactivatingId] = React.useState<string | null>(
    null,
  );

  const handleDeactivate = async (id: string) => {
    setDeactivatingId(id);
    await deactivateInvite(id);
    setDeactivatingId(null);
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold mb-1">Invite team members</h3>
            <p className="text-sm text-muted-foreground">
              Generate a code and share it with your team during signup.
            </p>
          </div>
          <Button type="button" onClick={onGenerate}>
            Generate invite code
          </Button>
        </div>

        {latestInviteCode && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <div className="px-3 py-2 rounded-md bg-muted font-mono text-sm">
                {latestInviteCode}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCopy}
              >
                {copyStatus === "copied" ? "Copied" : "Copy code"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires in 7 days. Share this code with your team member during
              signup.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Members select Team Member during signup and enter this code. They are
          added automatically.
        </p>
      </section>

      <section className="bg-card border border-border rounded-lg p-6 space-y-3">
        <h3 className="text-base font-semibold">Active invites</h3>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active invite codes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => {
                  const created = inv.created_at
                    ? new Date(inv.created_at)
                    : null;
                  const expires = inv.expires_at
                    ? new Date(inv.expires_at)
                    : null;
                  const expired =
                    !!expires && expires.getTime() <= now.getTime();
                  const used = !!inv.used_by;
                  const status = expired
                    ? "Expired"
                    : used
                      ? "Used"
                      : "Active";
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">
                        {inv.code}
                      </TableCell>
                      <TableCell>
                        {created
                          ? created.toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {expires
                          ? expires.toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${
                            expired
                              ? "text-muted-foreground"
                              : used
                                ? "text-muted-foreground"
                                : "text-emerald-400"
                          }`}
                        >
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!expired && !used && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(inv.id)}
                            disabled={deactivatingId === inv.id}
                          >
                            {deactivatingId === inv.id
                              ? "Deactivating..."
                              : "Deactivate"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsTab({
  orgDetails,
  orgNameDraft,
  setOrgNameDraft,
  settingsDraft,
  setSettingsDraft,
  onSave,
  saving,
  saved,
  error,
}: {
  orgDetails: ReturnType<typeof useTeam>["orgDetails"];
  orgNameDraft: string;
  setOrgNameDraft: (v: string) => void;
  settingsDraft: {
    weeklyDigestEnabled: boolean;
    digestDay: string;
    digestTime: string;
    silenceAlertDays: number;
  } | null;
  setSettingsDraft: (
    v: {
      weeklyDigestEnabled: boolean;
      digestDay: string;
      digestTime: string;
      silenceAlertDays: number;
    } | null,
  ) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  saved: boolean;
  error: string | null;
}) {
  if (!settingsDraft) {
    return (
      <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  const setDraft = (
    patch: Partial<{
      weeklyDigestEnabled: boolean;
      digestDay: string;
      digestTime: string;
      silenceAlertDays: number;
    }>,
  ) => {
    setSettingsDraft({
      ...settingsDraft,
      ...patch,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold">Organisation</h3>
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="org-name">
            Organisation name
          </Label>
          <Input
            id="org-name"
            value={orgNameDraft}
            onChange={(e) => setOrgNameDraft(e.target.value)}
            className="bg-background"
          />
        </div>
        {orgDetails?.created_at && (
          <p className="text-xs text-muted-foreground">
            Created{" "}
            {new Date(orgDetails.created_at).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
            .
          </p>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold">Weekly digest</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly digest emails</p>
              <p className="text-xs text-muted-foreground">
                Summary of team patterns sent once per week.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={settingsDraft.weeklyDigestEnabled ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setDraft({
                weeklyDigestEnabled: !settingsDraft.weeklyDigestEnabled,
              })
            }
          >
            {settingsDraft.weeklyDigestEnabled ? "On" : "Off"}
          </Button>
        </div>
        {settingsDraft.weeklyDigestEnabled && (
          <div className="flex flex-wrap gap-4 items-end pt-2">
            <div className="space-y-1">
              <Label className="text-sm">Day</Label>
              <select
                value={settingsDraft.digestDay}
                onChange={(e) =>
                  setDraft({ digestDay: e.target.value || "monday" })
                }
                className="bg-background border border-input rounded-md h-9 px-2 text-sm"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Time</Label>
              <Input
                type="time"
                value={settingsDraft.digestTime}
                onChange={(e) =>
                  setDraft({ digestTime: e.target.value || "09:00" })
                }
                className="bg-background w-32"
              />
            </div>
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold">Silence alert threshold</h3>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Alert when a member has been silent for a number of days.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {settingsDraft.silenceAlertDays} day
                  {settingsDraft.silenceAlertDays === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-muted-foreground">1–14 days</span>
              </div>
              <Slider
                value={[settingsDraft.silenceAlertDays]}
                min={1}
                max={14}
                step={1}
                onValueChange={(v) =>
                  setDraft({ silenceAlertDays: Math.max(1, v?.[0] ?? 7) })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This controls when someone is counted as a silent member in the
              overview.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {saved && !error && (
        <p className="text-sm text-emerald-400">Settings saved.</p>
      )}

      <Button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium mt-2"
      >
        {saving ? "Saving..." : "Save organisation settings"}
      </Button>
    </div>
  );
}


