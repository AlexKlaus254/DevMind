import * as React from "react";
import { Link } from "react-router";
import { Bell, Mail, MessageSquare, Clock, FileDown } from "lucide-react";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export function Settings() {
  const {
    settings: dbSettings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    defaultSettings,
  } = useNotificationSettings();

  const [local, setLocal] = React.useState({
    browserNotifications: true,
    emailNotifications: false,
    telegramNotifications: false,
    silenceThreshold: "5",
    endOfProjectPrompts: true,
    weeklySummary: true,
  });
  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  React.useEffect(() => {
    if (!dbSettings) return;
    const ch = dbSettings.channel ?? defaultSettings.channel;
    setLocal({
      browserNotifications: ch.includes("browser"),
      emailNotifications: ch.includes("email"),
      telegramNotifications: ch.includes("telegram"),
      silenceThreshold: String(
        dbSettings.silence_threshold_days ?? defaultSettings.silence_threshold_days,
      ),
      endOfProjectPrompts:
        dbSettings.end_of_project_prompt ?? defaultSettings.end_of_project_prompt,
      weeklySummary:
        dbSettings.weekly_digest ?? defaultSettings.weekly_digest,
    });
  }, [dbSettings, defaultSettings.channel, defaultSettings.silence_threshold_days, defaultSettings.end_of_project_prompt, defaultSettings.weekly_digest]);

  const debouncedLocal = useDebounce(local, 800);
  const hasSyncedFromDb = React.useRef(false);

  React.useEffect(() => {
    if (dbSettings) hasSyncedFromDb.current = true;
  }, [dbSettings]);

  React.useEffect(() => {
    if (loading || !dbSettings || !hasSyncedFromDb.current) return;
    const ch: string[] = [];
    if (debouncedLocal.browserNotifications) ch.push("browser");
    if (debouncedLocal.emailNotifications) ch.push("email");
    if (debouncedLocal.telegramNotifications) ch.push("telegram");
    if (ch.length === 0) ch.push("browser");

    const payload = {
      channel: ch,
      reminder_style: "smart",
      silence_threshold_days: parseInt(debouncedLocal.silenceThreshold, 10) || 5,
      end_of_project_prompt: debouncedLocal.endOfProjectPrompts,
      weekly_digest: debouncedLocal.weeklySummary,
    };
    const sameAsDb =
      (dbSettings.channel ?? []).length === ch.length &&
      (dbSettings.channel ?? []).every((c, i) => c === ch[i]) &&
      (dbSettings.silence_threshold_days ?? 5) === payload.silence_threshold_days &&
      (dbSettings.end_of_project_prompt ?? true) === payload.end_of_project_prompt &&
      (dbSettings.weekly_digest ?? true) === payload.weekly_digest;
    if (sameAsDb) return;

    setSaveStatus("saving");
    saveSettings(payload).then((ok) => {
      setSaveStatus(ok ? "saved" : "failed");
      if (ok) setTimeout(() => setSaveStatus("idle"), 2000);
    });
  }, [debouncedLocal, loading, dbSettings, saveSettings]);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-8">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your notifications and preferences
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="h-48 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your notifications and preferences
              </p>
            </div>
            {saveStatus === "saved" && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Settings saved
              </span>
            )}
            {saveStatus === "failed" && (
              <span className="text-sm text-destructive">
                Failed to save settings.
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

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Reminder Channels</h2>
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="browser" className="text-base">
                      Browser Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get notified directly in your browser when it's time to
                      check in
                    </p>
                  </div>
                </div>
                <Switch
                  id="browser"
                  checked={local.browserNotifications}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, browserNotifications: checked })
                  }
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-base">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive gentle reminders via email when you haven't logged
                      in a while
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={local.emailNotifications}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, emailNotifications: checked })
                  }
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="telegram" className="text-base">
                      Telegram
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect your Telegram account for quick check-in reminders
                    </p>
                  </div>
                </div>
                <Switch
                  id="telegram"
                  checked={local.telegramNotifications}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, telegramNotifications: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold mb-2">
              Reminder Frequency
            </h3>
            <p className="text-sm text-muted-foreground">
              We use smart reminders - only notify you when you've been silent
              for a while
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Label htmlFor="threshold" className="text-sm">
                  Silence Detection Threshold
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a reminder if I haven't logged an entry in...
                </p>
              </div>
              <Select
                value={local.silenceThreshold}
                onValueChange={(value) =>
                  setLocal({ ...local, silenceThreshold: value })
                }
              >
                <SelectTrigger id="threshold" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Preview Messages</h2>
          <div className="space-y-3">
            {local.browserNotifications && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      DevMind Reminder
                    </div>
                    <div className="text-sm text-muted-foreground">
                      It's been 5 days since your last check-in on "Lumos API".
                      How's it going?
                    </div>
                  </div>
                </div>
              </div>
            )}
            {local.emailNotifications && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      Subject: Your "Lumos API" is waiting
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Hey! Just a friendly nudge - you haven't checked in on
                      your project in 5 days...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Additional Preferences</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="postmortem" className="text-base">
                  End of Project Prompts
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Prompt me to complete a post-mortem when I mark a project as
                  complete/abandoned
                </p>
              </div>
              <Switch
                id="postmortem"
                checked={local.endOfProjectPrompts}
                onCheckedChange={(checked) =>
                  setLocal({ ...local, endOfProjectPrompts: checked })
                }
              />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="summary" className="text-base">
                  Weekly Summary Digest
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive a weekly email with insights and patterns from your
                  check-ins
                </p>
              </div>
              <Switch
                id="summary"
                checked={local.weeklySummary}
                onCheckedChange={(checked) =>
                  setLocal({ ...local, weeklySummary: checked })
                }
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h2 className="text-lg font-semibold mb-3">Data</h2>
          <Link
            to="/app/export"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <FileDown className="w-4 h-4" />
            Export your data summary
          </Link>
        </div>
      </div>
    </div>
  );
}
