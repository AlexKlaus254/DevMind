import * as React from "react";
import { Link } from "react-router";
import { Bell, Mail, MessageSquare, FileDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type ReminderStyle = "smart" | "scheduled" | "aggressive" | "minimal";
type PlanReminderStyle = "morning" | "evening" | "both" | "custom";

type LocalSettings = {
  browserEnabled: boolean;
  browserPermission: NotificationPermission | "unsupported" | null;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  notificationEmail: string;
  telegramChatId: string;

  reminderStyle: ReminderStyle;
  scheduledDays: string[];
  scheduledTime: string;
  scheduledTimezone: string;

  silenceThresholdHours: number;
  customSilenceValue: number;
  customSilenceUnit: "hours" | "days";

  planReminderEnabled: boolean;
  planReminderStyle: PlanReminderStyle;
  planMorningTime: string;
  planEveningTime: string;
  planCustomTime: string;

  endOfProjectPrompt: boolean;
  weeklyDigest: boolean;
};

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function sliceTime(v: string | null | undefined): string {
  if (!v) return "";
  return v.slice(0, 5);
}

function clampPositiveInt(n: number, fallback = 1) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.round(n));
}

function normalizeSettings(s: LocalSettings) {
  const channels = [
    ...(s.browserEnabled ? ["browser"] : []),
    ...(s.emailEnabled ? ["email"] : []),
    ...(s.telegramEnabled ? ["telegram"] : []),
  ];
  const safeChannels = channels.length ? channels : ["browser"];
  const scheduledDays = [...(s.scheduledDays ?? [])].sort();
  const notificationEmail = s.notificationEmail.trim();
  const telegramChatId = s.telegramChatId.trim();
  return {
    channels: safeChannels,
    notificationEmail,
    telegramChatId,
    reminderStyle: s.reminderStyle,
    scheduledDays,
    scheduledTime: s.scheduledTime,
    scheduledTimezone: s.scheduledTimezone,
    silenceThresholdHours: clampPositiveInt(s.silenceThresholdHours, 120),
    planReminderEnabled: !!s.planReminderEnabled,
    planReminderStyle: s.planReminderStyle,
    planMorningTime: s.planMorningTime,
    planEveningTime: s.planEveningTime,
    planCustomTime: s.planCustomTime,
    endOfProjectPrompt: !!s.endOfProjectPrompt,
    weeklyDigest: !!s.weeklyDigest,
  };
}

export function Settings() {
  const { user } = useAuth();
  const { fetchSettings, saveSettings, loading, error } = useNotificationSettings();

  const hasLoadedRef = React.useRef(false);
  const [local, setLocal] = React.useState<LocalSettings | null>(null);
  const [savedSnapshot, setSavedSnapshot] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<
    { type: "idle" } | { type: "saved" } | { type: "error"; message: string }
  >({ type: "idle" });

  const [browserMessage, setBrowserMessage] = React.useState<string | null>(null);
  const [telegramTestStatus, setTelegramTestStatus] = React.useState<
    "idle" | "sent"
  >("idle");

  React.useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!user?.id) return;
    fetchSettings().then((data) => {
      if (!data) return;
      const channels = data.channel ?? ["browser"];
      const tz =
        data.scheduled_timezone ??
        (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat().resolvedOptions().timeZone
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC");

      const silenceHours =
        data.silence_threshold_hours ??
        (data.silence_threshold_days != null ? data.silence_threshold_days * 24 : 120);

      const planEnabled = data.plan_reminder_enabled ?? true;
      const planStyle = (data.plan_reminder_style as PlanReminderStyle | null) ?? "morning";
      const planTime = sliceTime(data.plan_reminder_time) || "08:00";
      const planCustomTime = sliceTime(data.plan_reminder_custom_time) || "21:00";

      const initial: LocalSettings = {
        browserEnabled: channels.includes("browser"),
        browserPermission:
          typeof window !== "undefined" && "Notification" in window
            ? Notification.permission
            : "unsupported",
        emailEnabled: channels.includes("email"),
        telegramEnabled: channels.includes("telegram"),
        notificationEmail: data.notification_email ?? user.email ?? "",
        telegramChatId: data.telegram_chat_id ?? "",

        reminderStyle: (data.reminder_style as ReminderStyle | null) ?? "smart",
        scheduledDays: data.scheduled_days ?? [],
        scheduledTime: sliceTime(data.scheduled_time),
        scheduledTimezone: tz,

        silenceThresholdHours: silenceHours,
        customSilenceValue: silenceHours >= 24 && silenceHours % 24 === 0 ? silenceHours / 24 : silenceHours,
        customSilenceUnit: silenceHours >= 24 && silenceHours % 24 === 0 ? "days" : "hours",

        planReminderEnabled: planEnabled,
        planReminderStyle: planStyle,
        planMorningTime: planTime || "08:00",
        planEveningTime: planCustomTime || "21:00",
        planCustomTime: planCustomTime || "08:00",

        endOfProjectPrompt: data.end_of_project_prompt ?? true,
        weeklyDigest: data.weekly_digest ?? true,
      };

      const snapshot = JSON.stringify(normalizeSettings(initial));
      setLocal(initial);
      setSavedSnapshot(snapshot);
      hasLoadedRef.current = true;
    });
  }, [fetchSettings, user?.id, user?.email]);

  const hasUnsaved = React.useMemo(() => {
    if (!local || !savedSnapshot) return false;
    return JSON.stringify(normalizeSettings(local)) !== savedSnapshot;
  }, [local, savedSnapshot]);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const requestBrowserPermission = React.useCallback(async () => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setBrowserMessage("Browser notifications not supported in this environment.");
      setLocal((prev) =>
        prev
          ? { ...prev, browserEnabled: false, browserPermission: "unsupported" }
          : prev,
      );
      return;
    }
    setBrowserMessage(null);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setLocal((prev) =>
        prev ? { ...prev, browserEnabled: true, browserPermission: permission } : prev,
      );
      return;
    }
    setLocal((prev) =>
      prev ? { ...prev, browserEnabled: false, browserPermission: permission } : prev,
    );
    setBrowserMessage(
      "Browser notifications blocked. Enable in your browser settings.",
    );
  }, []);

  const setSilencePreset = (hours: number) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const unit =
        hours >= 24 && hours % 24 === 0 ? ("days" as const) : ("hours" as const);
      const value = unit === "days" ? hours / 24 : hours;
      return {
        ...prev,
        silenceThresholdHours: hours,
        customSilenceUnit: unit,
        customSilenceValue: value,
      };
    });
  };

  const onSave = async () => {
    if (!local) return;
    setSaving(true);
    setStatus({ type: "idle" });
    try {
      const normalized = normalizeSettings(local);

      const payload = {
        channel: normalized.channels,
        reminder_style: normalized.reminderStyle,
        scheduled_days:
          normalized.reminderStyle === "scheduled" ? normalized.scheduledDays : null,
        scheduled_time:
          normalized.reminderStyle === "scheduled" && normalized.scheduledTime
            ? `${normalized.scheduledTime}:00`
            : null,
        scheduled_timezone:
          normalized.reminderStyle === "scheduled" ? normalized.scheduledTimezone : null,

        silence_threshold_hours: normalized.silenceThresholdHours,

        notification_email: normalized.channels.includes("email")
          ? normalized.notificationEmail || null
          : null,
        telegram_chat_id: normalized.channels.includes("telegram")
          ? normalized.telegramChatId || null
          : null,

        plan_reminder_enabled: normalized.planReminderEnabled,
        plan_reminder_style: normalized.planReminderStyle,
        plan_reminder_time:
          normalized.planReminderStyle === "custom"
            ? null
            : normalized.planReminderStyle === "both"
              ? `${normalized.planMorningTime}:00`
              : `${(normalized.planReminderStyle === "evening"
                  ? normalized.planEveningTime
                  : normalized.planMorningTime)}:00`,
        plan_reminder_custom_time:
          normalized.planReminderStyle === "both"
            ? `${normalized.planEveningTime}:00`
            : normalized.planReminderStyle === "custom"
              ? `${normalized.planCustomTime}:00`
              : null,

        end_of_project_prompt: normalized.endOfProjectPrompt,
        weekly_digest: normalized.weeklyDigest,
      };

      const ok = await saveSettings(payload);
      if (!ok) {
        setStatus({ type: "error", message: "Failed to save settings." });
        return;
      }
      const snapshot = JSON.stringify(normalized);
      setSavedSnapshot(snapshot);
      setStatus({ type: "saved" });
      window.setTimeout(() => setStatus({ type: "idle" }), 3000);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "Failed to save settings.";
      setStatus({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!local || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Notification channels, reminder style, and triggers
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="h-56 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const scheduledActive = local.reminderStyle === "scheduled";
  const preset =
    local.silenceThresholdHours === 1 ||
    local.silenceThresholdHours === 6 ||
    local.silenceThresholdHours === 24 ||
    local.silenceThresholdHours === 72
      ? local.silenceThresholdHours
      : null;

  const tzDefault =
    typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const timezones = Array.from(new Set([tzDefault, "UTC", "Europe/London", "America/New_York", "Asia/Singapore"]));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notification channels, reminders, and triggers
          </p>
        </div>
      </div>

      {(error || status.type === "error") && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {status.type === "error" ? status.message : error}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Section 1 — Notification Channels */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Notification channels</h2>

          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base">Browser</Label>
                    <p className="text-sm text-muted-foreground">
                      Browser notifications on this device.
                    </p>
                    {browserMessage && (
                      <p className="text-xs text-destructive">{browserMessage}</p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={local.browserEnabled}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setLocal({ ...local, browserEnabled: false });
                      return;
                    }
                    requestBrowserPermission();
                  }}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base">Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Sends reminders to an email address.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={local.emailEnabled}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, emailEnabled: checked })
                  }
                />
              </div>

              {local.emailEnabled && (
                <div className="pl-14 md:pl-16 space-y-2">
                  <Label htmlFor="notification-email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="notification-email"
                    type="email"
                    value={local.notificationEmail}
                    onChange={(e) =>
                      setLocal({ ...local, notificationEmail: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base">Telegram</Label>
                    <p className="text-sm text-muted-foreground">
                      Stores a chat id for Telegram notifications.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={local.telegramEnabled}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, telegramEnabled: checked })
                  }
                />
              </div>

              {local.telegramEnabled && (
                <div className="pl-14 md:pl-16 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chat-id" className="text-sm">
                      Chat ID
                    </Label>
                    <Input
                      id="telegram-chat-id"
                      value={local.telegramChatId}
                      onChange={(e) =>
                        setLocal({ ...local, telegramChatId: e.target.value })
                      }
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Find your Chat ID: open Telegram, message @userinfobot, it
                      replies with your ID.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTelegramTestStatus("sent");
                        window.setTimeout(() => setTelegramTestStatus("idle"), 2000);
                      }}
                    >
                      Send test
                    </Button>
                    {telegramTestStatus === "sent" && (
                      <span className="text-xs text-emerald-400">Test sent</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2 — Reminder Style */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Reminder style</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectableCard
              title="Smart"
              description="Detects your rhythm, reminds when you fall behind it."
              selected={local.reminderStyle === "smart"}
              onSelect={() => setLocal({ ...local, reminderStyle: "smart" })}
            />
            <SelectableCard
              title="Scheduled"
              description="You pick days and time."
              selected={local.reminderStyle === "scheduled"}
              onSelect={() => setLocal({ ...local, reminderStyle: "scheduled" })}
            />
            <SelectableCard
              title="Aggressive"
              description="Daily if no entry logged."
              selected={local.reminderStyle === "aggressive"}
              onSelect={() => setLocal({ ...local, reminderStyle: "aggressive" })}
            />
            <SelectableCard
              title="Minimal"
              description="Only at project milestones."
              selected={local.reminderStyle === "minimal"}
              onSelect={() => setLocal({ ...local, reminderStyle: "minimal" })}
            />
          </div>

          {scheduledActive && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => {
                    const active = local.scheduledDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const exists = local.scheduledDays.includes(day);
                          setLocal({
                            ...local,
                            scheduledDays: exists
                              ? local.scheduledDays.filter((d) => d !== day)
                              : [...local.scheduledDays, day],
                          });
                        }}
                        className={`px-3 py-1 rounded-full text-xs border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-sm" htmlFor="scheduled-time">
                    Time
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={local.scheduledTime}
                    onChange={(e) =>
                      setLocal({ ...local, scheduledTime: e.target.value })
                    }
                    className="bg-background w-40"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Timezone</Label>
                  <Select
                    value={local.scheduledTimezone}
                    onValueChange={(v) => setLocal({ ...local, scheduledTimezone: v })}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 3 — Reminder Frequency */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Reminder frequency</h2>
          <p className="text-sm text-muted-foreground">Remind me after silence of:</p>

          <div className="flex flex-wrap gap-2">
            {([
              { label: "1 hour", hours: 1 },
              { label: "6 hours", hours: 6 },
              { label: "1 day", hours: 24 },
              { label: "3 days", hours: 72 },
            ] as const).map((p) => (
              <button
                key={p.hours}
                type="button"
                onClick={() => setSilencePreset(p.hours)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  preset === p.hours
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-sm">Custom</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={local.customSilenceValue}
                    onChange={(e) => {
                      const v = clampPositiveInt(Number(e.target.value) || 1, 1);
                      const hours = local.customSilenceUnit === "days" ? v * 24 : v;
                      setLocal({
                        ...local,
                        customSilenceValue: v,
                        silenceThresholdHours: hours,
                      });
                    }}
                    className="w-24 bg-background"
                  />
                  <Select
                    value={local.customSilenceUnit}
                    onValueChange={(unit: "hours" | "days") => {
                      const v = clampPositiveInt(local.customSilenceValue, 1);
                      const hours = unit === "days" ? v * 24 : v;
                      setLocal({
                        ...local,
                        customSilenceUnit: unit,
                        silenceThresholdHours: hours,
                      });
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">hours</SelectItem>
                      <SelectItem value="days">days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Stored internally as {local.silenceThresholdHours} hours.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 — Daily Plan Reminder */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Daily plan reminder</h2>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-base">Remind me to fill my daily plan</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  A gentle nudge to set your plan at a consistent time.
                </p>
              </div>
              <Switch
                checked={local.planReminderEnabled}
                onCheckedChange={(checked) =>
                  setLocal({ ...local, planReminderEnabled: checked })
                }
              />
            </div>

            {local.planReminderEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <PlanCard
                  title="Morning"
                  description={`Remind me at ${local.planMorningTime} to plan today`}
                  selected={local.planReminderStyle === "morning"}
                  onSelect={() =>
                    setLocal({ ...local, planReminderStyle: "morning" })
                  }
                >
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={local.planMorningTime}
                    onChange={(e) =>
                      setLocal({ ...local, planMorningTime: e.target.value || "08:00" })
                    }
                    className="bg-background w-40"
                  />
                </PlanCard>

                <PlanCard
                  title="Evening"
                  description={`Remind me at ${local.planEveningTime} night before`}
                  selected={local.planReminderStyle === "evening"}
                  onSelect={() =>
                    setLocal({ ...local, planReminderStyle: "evening" })
                  }
                >
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={local.planEveningTime}
                    onChange={(e) =>
                      setLocal({ ...local, planEveningTime: e.target.value || "21:00" })
                    }
                    className="bg-background w-40"
                  />
                </PlanCard>

                <PlanCard
                  title="Both"
                  description="Morning + evening reminders"
                  selected={local.planReminderStyle === "both"}
                  onSelect={() =>
                    setLocal({ ...local, planReminderStyle: "both" })
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Morning</Label>
                      <Input
                        type="time"
                        value={local.planMorningTime}
                        onChange={(e) =>
                          setLocal({ ...local, planMorningTime: e.target.value || "08:00" })
                        }
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Evening</Label>
                      <Input
                        type="time"
                        value={local.planEveningTime}
                        onChange={(e) =>
                          setLocal({ ...local, planEveningTime: e.target.value || "21:00" })
                        }
                        className="bg-background"
                      />
                    </div>
                  </div>
                </PlanCard>

                <PlanCard
                  title="Custom"
                  description={`Remind me at ${local.planCustomTime}`}
                  selected={local.planReminderStyle === "custom"}
                  onSelect={() =>
                    setLocal({ ...local, planReminderStyle: "custom" })
                  }
                >
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={local.planCustomTime}
                    onChange={(e) =>
                      setLocal({ ...local, planCustomTime: e.target.value || "08:00" })
                    }
                    className="bg-background w-40"
                  />
                </PlanCard>
              </div>
            )}
          </div>
        </section>

        {/* Section 5 — Project Event Triggers */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Project event triggers</h2>

          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">
                    Prompt post-mortem on status change
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Opens a post-mortem after marking a project completed/paused/abandoned.
                  </p>
                </div>
                <Switch
                  checked={local.endOfProjectPrompt}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, endOfProjectPrompt: checked })
                  }
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">Weekly digest</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receives an aggregated weekly summary.
                  </p>
                </div>
                <Switch
                  checked={local.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, weeklyDigest: checked })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save */}
        <section className="pt-2">
          {status.type === "saved" && (
            <p className="text-sm text-emerald-400/80 mb-2">Settings saved.</p>
          )}
          {hasUnsaved && status.type === "idle" && (
            <p className="text-xs text-muted-foreground mb-2">
              You have unsaved changes.
            </p>
          )}

          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !hasUnsaved}
            className="w-full"
            size="lg"
          >
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </section>

        {/* Data */}
        <section className="pt-4 border-t border-border">
          <h2 className="text-lg font-semibold mb-3">Data</h2>
          <Link
            to="/app/export"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <FileDown className="w-4 h-4" />
            Export your data summary
          </Link>
        </section>
      </div>
    </div>
  );
}

function SelectableCard(props: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { title, description, selected, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left bg-card border rounded-lg p-4 space-y-2 transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className={`h-2 w-2 rounded-full ${selected ? "bg-primary" : "bg-muted-foreground/40"}`} />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function PlanCard(props: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const { title, description, selected, onSelect, children } = props;
  return (
    <div
      className={`bg-card border rounded-lg p-4 space-y-3 transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border"
      }`}
    >
      <button type="button" onClick={onSelect} className="text-left w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{title}</span>
          <span className={`h-2 w-2 rounded-full ${selected ? "bg-primary" : "bg-muted-foreground/40"}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </button>
      {children}
    </div>
  );
}

