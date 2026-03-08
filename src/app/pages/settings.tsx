import * as React from "react";
import { Link } from "react-router";
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  FileDown,
} from "lucide-react";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
import { useAuth } from "../../contexts/AuthContext";

type ReminderStyle = "smart" | "scheduled" | "aggressive" | "minimal";

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
  silencePreset: 1 | 6 | 24 | 72 | "custom";
  customSilenceValue: number;
  customSilenceUnit: "hours" | "days";
  silenceThresholdHours: number;
  endOfProjectPrompt: boolean;
  weeklyDigest: boolean;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function Settings() {
  const { user } = useAuth();
  const {
    settings: dbSettings,
    loading,
    error,
    saveSettings,
    defaultSettings,
  } = useNotificationSettings();

  const [local, setLocal] = React.useState<LocalSettings | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [browserMessage, setBrowserMessage] = React.useState<string | null>(
    null,
  );
  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasLoadedRef.current || !dbSettings) return;
    const channels = dbSettings.channel ?? defaultSettings.channel;
    const hours =
      dbSettings.silence_threshold_hours ??
      (dbSettings.silence_threshold_days ??
        defaultSettings.silence_threshold_days) *
        24;

    const preset: LocalSettings["silencePreset"] =
      hours === 1 || hours === 6 || hours === 24 || hours === 72
        ? (hours as 1 | 6 | 24 | 72)
        : "custom";

    const customValue =
      preset === "custom" ? Math.max(1, Math.round(hours / 1)) : hours;

    const scheduledTime = dbSettings.scheduled_time
      ? dbSettings.scheduled_time.slice(0, 5)
      : "";

    setLocal({
      browserEnabled: channels.includes("browser"),
      browserPermission:
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "unsupported",
      emailEnabled: channels.includes("email"),
      telegramEnabled: channels.includes("telegram"),
      notificationEmail:
        dbSettings.notification_email ?? user?.email ?? "",
      telegramChatId: dbSettings.telegram_chat_id ?? "",
      reminderStyle:
        (dbSettings.reminder_style as ReminderStyle | null) ?? "smart",
      scheduledDays: dbSettings.scheduled_days ?? [],
      scheduledTime,
      scheduledTimezone:
        dbSettings.scheduled_timezone ??
        (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat().resolvedOptions().timeZone
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC"),
      silencePreset: preset,
      customSilenceValue: customValue,
      customSilenceUnit: "hours",
      silenceThresholdHours: hours,
      endOfProjectPrompt:
        dbSettings.end_of_project_prompt ??
        defaultSettings.end_of_project_prompt,
      weeklyDigest:
        dbSettings.weekly_digest ?? defaultSettings.weekly_digest,
    });
    hasLoadedRef.current = true;
  }, [dbSettings, defaultSettings, user?.email]);

  const debouncedLocal = useDebounce(local, 800);

  React.useEffect(() => {
    if (!local || loading || !user?.id) return;
    const nextChannels: string[] = [];
    if (local.browserEnabled) nextChannels.push("browser");
    if (local.emailEnabled) nextChannels.push("email");
    if (local.telegramEnabled) nextChannels.push("telegram");
    if (nextChannels.length === 0) nextChannels.push("browser");

    const hours =
      local.silencePreset === "custom"
        ? local.customSilenceUnit === "days"
          ? local.customSilenceValue * 24
          : local.customSilenceValue
        : local.silencePreset;

    const payload = {
      channel: nextChannels,
      reminder_style: local.reminderStyle,
      silence_threshold_hours: hours,
      end_of_project_prompt: local.endOfProjectPrompt,
      weekly_digest: local.weeklyDigest,
      notification_email: local.emailEnabled
        ? local.notificationEmail.trim() || null
        : null,
      telegram_chat_id: local.telegramEnabled
        ? local.telegramChatId.trim() || null
        : null,
      scheduled_days:
        local.reminderStyle === "scheduled" ? local.scheduledDays : null,
      scheduled_time:
        local.reminderStyle === "scheduled" && local.scheduledTime
          ? `${local.scheduledTime}:00`
          : null,
      scheduled_timezone:
        local.reminderStyle === "scheduled" ? local.scheduledTimezone : null,
    };

    setSaveStatus("saving");
    saveSettings(payload)
      .then((ok) => {
        setSaveStatus(ok ? "saved" : "failed");
        if (ok) setTimeout(() => setSaveStatus("idle"), 1500);
      })
      .catch(() => {
        setSaveStatus("failed");
      });
  }, [debouncedLocal, loading, saveSettings, user?.id]);

  const saveOnBlur = React.useCallback(() => {
    if (!local || !user?.id) return;
    const nextChannels: string[] = [];
    if (local.browserEnabled) nextChannels.push("browser");
    if (local.emailEnabled) nextChannels.push("email");
    if (local.telegramEnabled) nextChannels.push("telegram");
    if (nextChannels.length === 0) nextChannels.push("browser");
    const hours =
      local.silencePreset === "custom"
        ? local.customSilenceUnit === "days"
          ? local.customSilenceValue * 24
          : local.customSilenceValue
        : local.silencePreset;
    setSaveStatus("saving");
    saveSettings({
      channel: nextChannels,
      reminder_style: local.reminderStyle,
      silence_threshold_hours: hours,
      end_of_project_prompt: local.endOfProjectPrompt,
      weekly_digest: local.weeklyDigest,
      notification_email: local.emailEnabled
        ? local.notificationEmail.trim() || null
        : null,
      telegram_chat_id: local.telegramEnabled
        ? local.telegramChatId.trim() || null
        : null,
      scheduled_days:
        local.reminderStyle === "scheduled" ? local.scheduledDays : null,
      scheduled_time:
        local.reminderStyle === "scheduled" && local.scheduledTime
          ? `${local.scheduledTime}:00`
          : null,
      scheduled_timezone:
        local.reminderStyle === "scheduled" ? local.scheduledTimezone : null,
    })
      .then((ok) => {
        setSaveStatus(ok ? "saved" : "failed");
        if (ok) setTimeout(() => setSaveStatus("idle"), 1500);
      })
      .catch(() => setSaveStatus("failed"));
  }, [local, user?.id, saveSettings]);

  if (!local || loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Notification rules and triggers
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="h-48 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const handleToggleBrowser = async (checked: boolean) => {
    if (!checked) {
      setLocal({
        ...local,
        browserEnabled: false,
      });
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined"
    ) {
      setLocal({
        ...local,
        browserEnabled: false,
        browserPermission: "unsupported",
      });
      setBrowserMessage(
        "Browser notifications not supported in this environment.",
      );
      return;
    }

    setBrowserMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setLocal({
          ...local,
          browserEnabled: true,
          browserPermission: permission,
        });
      } else {
        setLocal({
          ...local,
          browserEnabled: false,
          browserPermission: permission,
        });
        setBrowserMessage(
          "Browser notifications blocked. Enable them in your browser settings.",
        );
      }
    } catch {
      setLocal({
        ...local,
        browserEnabled: false,
      });
    }
  };

  const handlePresetClick = (hours: 1 | 6 | 24 | 72) => {
    setLocal({
      ...local,
      silencePreset: hours,
      silenceThresholdHours: hours,
      customSilenceValue: hours,
      customSilenceUnit: "hours",
    });
  };

  const handleCustomChange = (value: number, unit: "hours" | "days") => {
    const normalized = Number.isFinite(value) && value > 0 ? value : 1;
    const hours = unit === "days" ? normalized * 24 : normalized;
    setLocal({
      ...local,
      silencePreset: "custom",
      customSilenceValue: normalized,
      customSilenceUnit: unit,
      silenceThresholdHours: hours,
    });
  };

  const scheduledActive = local.reminderStyle === "scheduled";

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Notification channels, reminder style, and triggers
              </p>
            </div>
            {saveStatus === "saving" && (
              <span className="text-sm text-muted-foreground">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-sm text-success">Saved</span>
            )}
            {saveStatus === "failed" && (
              <span className="text-sm text-destructive">
                Failed to save
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Section A — Notification Channels */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Notification channels
          </h2>
          <div className="space-y-3">
            {/* Browser */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base">Browser</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uses the Notification API on this device only.
                    </p>
                    {browserMessage && (
                      <p className="text-xs text-destructive mt-2">
                        {browserMessage}
                      </p>
                    )}
                  </div>
                </div>
                <Switch
                  checked={local.browserEnabled}
                  onCheckedChange={handleToggleBrowser}
                />
              </div>
            </div>

            {/* Email */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-base">Email</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sends reminders to the address below.
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
                <div className="space-y-2 pl-14 md:pl-16">
                  <Label htmlFor="notification-email" className="text-sm">
                    Notification email
                  </Label>
                  <Input
                    id="notification-email"
                    type="email"
                    value={local.notificationEmail}
                    onChange={(e) =>
                      setLocal((prev) =>
                        prev
                          ? { ...prev, notificationEmail: e.target.value }
                          : prev,
                      )
                    }
                    onBlur={saveOnBlur}
                    className="bg-background"
                  />
                </div>
              )}
            </div>

            {/* Telegram */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-base">Telegram</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Stores a chat id for a future Telegram bot.
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
                <div className="space-y-3 pl-14 md:pl-16">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chat-id" className="text-sm">
                      Telegram Chat ID
                    </Label>
                    <Input
                      id="telegram-chat-id"
                      value={local.telegramChatId}
                      onChange={(e) =>
                        setLocal((prev) =>
                          prev
                            ? { ...prev, telegramChatId: e.target.value }
                            : prev,
                        )
                      }
                      onBlur={saveOnBlur}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      To find your Chat ID: open Telegram, search for
                      @userinfobot, send it any message, it replies with your
                      Chat ID.
                    </p>
                  </div>
                  <TelegramTestButton chatId={local.telegramChatId} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section B — Reminder Style */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Reminder style</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReminderStyleCard
              title="Smart"
              description="Detects your journaling rhythm and only prompts when you fall behind it."
              selected={local.reminderStyle === "smart"}
              onSelect={() =>
                setLocal({ ...local, reminderStyle: "smart" })
              }
            />
            <ReminderStyleCard
              title="Scheduled"
              description="You choose specific days and a time."
              selected={local.reminderStyle === "scheduled"}
              onSelect={() =>
                setLocal({ ...local, reminderStyle: "scheduled" })
              }
            />
            <ReminderStyleCard
              title="Aggressive"
              description="Daily reminder if no entry logged."
              selected={local.reminderStyle === "aggressive"}
              onSelect={() =>
                setLocal({ ...local, reminderStyle: "aggressive" })
              }
            />
            <ReminderStyleCard
              title="Minimal"
              description="Only at project milestones."
              selected={local.reminderStyle === "minimal"}
              onSelect={() =>
                setLocal({ ...local, reminderStyle: "minimal" })
              }
            />
          </div>

          {scheduledActive && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-sm">Days</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAY_OPTIONS.map((day) => {
                    const active = local.scheduledDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const exists =
                            local.scheduledDays.includes(day);
                          setLocal({
                            ...local,
                            scheduledDays: exists
                              ? local.scheduledDays.filter(
                                  (d) => d !== day,
                                )
                              : [...local.scheduledDays, day],
                          });
                        }}
                        className={`px-3 py-1 rounded-full text-xs border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="space-y-1">
                  <Label htmlFor="scheduled-time" className="text-sm">
                    Time
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={local.scheduledTime}
                    onChange={(e) =>
                      setLocal({
                        ...local,
                        scheduledTime: e.target.value,
                      })
                    }
                    className="bg-background w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Timezone</Label>
                  <Select
                    value={local.scheduledTimezone}
                    onValueChange={(v) =>
                      setLocal({ ...local, scheduledTimezone: v })
                    }
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/London">
                        Europe/London
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        America/New_York
                      </SelectItem>
                      <SelectItem value="Africa/Nairobi">
                        Africa/Nairobi
                      </SelectItem>
                      <SelectItem value="Asia/Singapore">
                        Asia/Singapore
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section C — Reminder Frequency */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Reminder frequency
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Remind me after silence of:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { label: "1 hour", value: 1 },
              { label: "6 hours", value: 6 },
              { label: "1 day", value: 24 },
              { label: "3 days", value: 72 },
            ] as const).map((opt) => {
              const active =
                local.silencePreset !== "custom" &&
                local.silencePreset === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      opt.value as 1 | 6 | 24 | 72,
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-sm">Custom</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={
                    local.silencePreset === "custom"
                      ? local.customSilenceValue
                      : ""
                  }
                  onChange={(e) =>
                    handleCustomChange(
                      Number(e.target.value) || 1,
                      local.customSilenceUnit,
                    )
                  }
                  className="w-24 bg-background"
                />
                <Select
                  value={local.customSilenceUnit}
                  onValueChange={(v: "hours" | "days") =>
                    handleCustomChange(
                      local.customSilenceValue,
                      v,
                    )
                  }
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
        </section>

        {/* Section D — Project event triggers */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Project event triggers
          </h2>
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">
                    Prompt for post-mortem when project status changes
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    When a project is marked completed, paused, or
                    abandoned, open a post-mortem.
                  </p>
                </div>
                <Switch
                  checked={local.endOfProjectPrompt}
                  onCheckedChange={(checked) =>
                    setLocal({
                      ...local,
                      endOfProjectPrompt: checked,
                    })
                  }
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">
                    Weekly pattern summary digest
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aggregated summary sent via your chosen channel.
                  </p>
                </div>
                <Switch
                  checked={local.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setLocal({
                      ...local,
                      weeklyDigest: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section — Data / export link */}
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

function ReminderStyleCard(props: {
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
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function TelegramTestButton({ chatId }: { chatId: string }) {
  const [status, setStatus] = React.useState<
    "idle" | "sending" | "ok" | "error"
  >("idle");
  const disabled = !chatId.trim();

  const handleClick = async () => {
    if (disabled) return;
    setStatus("sending");
    try {
      // Placeholder edge function call. Actual bot wiring is next phase.
      await fetch("/functions/v1/test-telegram-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatId.trim() }),
      });
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={disabled || status === "sending"}
      >
        Test notification
      </Button>
      {status === "ok" && (
        <span className="text-xs text-success">
          Sent test payload (bot wiring pending).
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-destructive">
          Failed to call test function.
        </span>
      )}
    </div>
  );
}

