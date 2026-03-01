import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const ABANDONMENT_REASONS = [
  "Lost interest",
  "Got overwhelmed",
  "Life got busy",
  "Lost confidence",
  "No accountability",
  "Scope grew too large",
  "Other",
];

const REMINDER_STYLES = [
  { value: "smart", label: "Smart", desc: "Only when you've been silent for a while" },
  { value: "scheduled", label: "Scheduled", desc: "Fixed times each week" },
  { value: "aggressive", label: "Aggressive", desc: "Daily until you log" },
  { value: "minimal", label: "Minimal", desc: "Rarely" },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refetchProfile } = useAuth();
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    role: "solo",
    primary_skill: "",
    projects_started_last_6m: 0,
    projects_completed_last_6m: 0,
    common_abandonment_reason: "",
    self_consistency_rating: 5,
    three_month_goal: "",
    channel: "browser",
    reminder_style: "smart",
  });

  React.useEffect(() => {
    if (profile?.name) setForm((f) => ({ ...f, name: profile.name ?? "" }));
    if (profile?.role) setForm((f) => ({ ...f, role: profile.role ?? "solo" }));
    if (profile?.primary_skill) setForm((f) => ({ ...f, primary_skill: profile.primary_skill ?? "" }));
  }, [profile]);

  const handleComplete = async () => {
    if (!user?.id) return;
    setError(null);
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        name: form.name.trim() || null,
        role: form.role,
        primary_skill: form.primary_skill.trim() || null,
        onboarding_complete: true,
      }).eq("id", user.id);

      await supabase.from("onboarding_baseline").insert({
        user_id: user.id,
        projects_started_last_6m: form.projects_started_last_6m || null,
        projects_completed_last_6m: form.projects_completed_last_6m || null,
        common_abandonment_reason: form.common_abandonment_reason || null,
        self_consistency_rating: form.self_consistency_rating || null,
        three_month_goal: form.three_month_goal.trim() || null,
      });

      await supabase.from("notification_settings").upsert({
        user_id: user.id,
        channel: [form.channel],
        reminder_style: form.reminder_style,
        silence_threshold_days: 5,
        end_of_project_prompt: true,
        weekly_digest: true,
      }, { onConflict: "user_id" });

      await refetchProfile();
      navigate("/app", { replace: true });
    } catch (e) {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-lg text-center space-y-8">
          <p className="text-foreground whitespace-pre-line leading-relaxed">
            DevMind is not a productivity app.
            {"\n"}It does not reward you for logging.
            {"\n"}It does not congratulate you for finishing.
            {"\n"}It records what you do and what you avoid equally.
            {"\n"}Silence is data. Abandonment is data.
            {"\n"}Mistakes are data.
            {"\n"}The goal is not to feel good about your habits.
            {"\n"}The goal is to see them clearly enough to change them.
            {"\n"}If you are ready for that, continue.
          </p>
          <Button size="lg" onClick={() => setStep(2)}>
            I understand. Continue.
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-xl font-semibold">Profile basics</h2>
          <div className="space-y-2">
            <Label htmlFor="onb-name">Name</Label>
            <Input
              id="onb-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-skill">Primary skill to track</Label>
            <Input
              id="onb-skill"
              value={form.primary_skill}
              onChange={(e) => setForm({ ...form, primary_skill: e.target.value })}
              placeholder="e.g. React, API design"
              className="bg-background"
            />
          </div>
          <Button onClick={() => setStep(3)}>Next</Button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-xl font-semibold">Baseline assessment</h2>
          <div className="space-y-2">
            <Label htmlFor="onb-started">In the last 6 months, how many personal projects have you started?</Label>
            <Input
              id="onb-started"
              type="number"
              min={0}
              value={form.projects_started_last_6m || ""}
              onChange={(e) =>
                setForm({ ...form, projects_started_last_6m: parseInt(e.target.value, 10) || 0 })
              }
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-completed">How many of those did you complete?</Label>
            <Input
              id="onb-completed"
              type="number"
              min={0}
              value={form.projects_completed_last_6m || ""}
              onChange={(e) =>
                setForm({ ...form, projects_completed_last_6m: parseInt(e.target.value, 10) || 0 })
              }
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>What is your most common reason for not finishing?</Label>
            <Select
              value={form.common_abandonment_reason}
              onValueChange={(v) => setForm({ ...form, common_abandonment_reason: v })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {ABANDONMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>How would you rate your current consistency as a builder? (1-10)</Label>
            <Slider
              value={[form.self_consistency_rating]}
              onValueChange={([v]) => setForm({ ...form, self_consistency_rating: v ?? 5 })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">{form.self_consistency_rating}/10</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-goal">What does meaningful improvement look like for you in 3 months?</Label>
            <Input
              id="onb-goal"
              value={form.three_month_goal}
              onChange={(e) => setForm({ ...form, three_month_goal: e.target.value })}
              placeholder="Short text"
              className="bg-background"
            />
          </div>
          <Button onClick={() => setStep(4)}>Next</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-xl font-semibold">Notification setup</h2>
        <div className="space-y-2">
          <Label>Reminder channel</Label>
          <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Browser</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reminder style</Label>
          <Select
            value={form.reminder_style}
            onValueChange={(v) => setForm({ ...form, reminder_style: v })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}: {s.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
        <Button onClick={handleComplete} disabled={saving}>
          {saving ? "Saving…" : "Finish"}
        </Button>
      </div>
    </div>
  );
}
