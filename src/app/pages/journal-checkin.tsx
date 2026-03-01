import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { EmojiSelector } from "../components/devmind/emoji-selector";
import { NumberSelector } from "../components/devmind/number-selector";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { useProjects } from "../../hooks/useProjects";
import { useJournal } from "../../hooks/useJournal";
import type { ProjectRow } from "../../hooks/useProjects";

export function JournalCheckin() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchProject } = useProjects();
  const { createEntry } = useJournal(id);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [showDeeper, setShowDeeper] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    energy: 0,
    confidence: 5,
    blocked: false,
    blockDescription: "",
    oneWord: "",
    stillMotivated: true as boolean | null,
    deeperReflection: "",
  });

  const energyEmojis = ["😫", "😐", "🙂", "😊", "🚀"];
  const energyLabels = ["Drained", "Energized"];

  useEffect(() => {
    if (!id) return;
    fetchProject(id).then(setProject);
  }, [id, fetchProject]);

  const dayCount =
    project?.started_at != null
      ? Math.floor(
          (Date.now() - new Date(project.started_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;

  const handleSubmit = async () => {
    if (!id) return;
    setSaving(true);
    setSubmitStatus("idle");
    const stillMotivated =
      formData.stillMotivated === true
        ? "yes"
        : formData.stillMotivated === false
          ? "no"
          : "unsure";
    const result = await createEntry({
      energy_score: formData.energy > 0 ? formData.energy : 1,
      confidence_score: formData.confidence,
      mood_word: formData.oneWord.trim() || null,
      was_blocked: formData.blocked,
      blocker_note: formData.blockDescription.trim() || null,
      still_motivated: stillMotivated,
      reflection: formData.deeperReflection.trim() || null,
      entry_mode: "quick",
    });
    setSaving(false);
    if (result) {
      setSubmitStatus("success");
      setTimeout(() => navigate("/app/projects"), 1500);
    } else {
      setSubmitStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <button
            onClick={() => navigate("/app/projects")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-semibold">
              {project?.name ?? "…"}
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              Day {dayCount}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24">
        {submitStatus === "success" && (
          <div className="mb-6 text-sm rounded-md border border-success/30 bg-success/10 text-success px-4 py-3">
            Entry logged.
          </div>
        )}
        {submitStatus === "error" && (
          <div className="mb-6 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            Failed to save entry.
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-base">How's your energy right now?</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Be honest with yourself
              </p>
            </div>
            <EmojiSelector
              value={formData.energy}
              onChange={(value) =>
                setFormData({ ...formData, energy: value })
              }
              emojis={energyEmojis}
              labels={energyLabels}
            />
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-base">
                Confidence on this project today
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                1 = very low, 10 = very high
              </p>
            </div>
            <NumberSelector
              value={formData.confidence}
              onChange={(value) =>
                setFormData({ ...formData, confidence: value })
              }
              min={1}
              max={10}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="blocked" className="text-base">
                  Blocked today?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Did anything prevent you from making progress?
                </p>
              </div>
              <Switch
                id="blocked"
                checked={formData.blocked}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, blocked: checked })
                }
              />
            </div>

            {formData.blocked && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="blockDescription" className="text-sm">
                  What blocked you?
                </Label>
                <Input
                  id="blockDescription"
                  value={formData.blockDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      blockDescription: e.target.value,
                    })
                  }
                  placeholder="e.g., API documentation unclear, dependency issues"
                  className="bg-background"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="oneWord" className="text-base">
              One word to describe your session
            </Label>
            <Input
              id="oneWord"
              value={formData.oneWord}
              onChange={(e) =>
                setFormData({ ...formData, oneWord: e.target.value })
              }
              placeholder="productive, frustrated, focused, confused..."
              className="bg-background text-center text-lg"
              maxLength={30}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <Label className="text-base mb-4 block">
              Are you still motivated to finish this project?
            </Label>
            <div className="flex gap-3">
              {(["Yes", "Unsure", "No"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      stillMotivated:
                        option === "Yes"
                          ? true
                          : option === "No"
                            ? false
                            : null,
                    })
                  }
                  className={`flex-1 h-12 rounded-lg border-2 transition-all font-medium ${
                    (option === "Yes" && formData.stillMotivated === true) ||
                    (option === "No" && formData.stillMotivated === false) ||
                    (option === "Unsure" && formData.stillMotivated === null)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowDeeper(!showDeeper)}
              className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Write a deeper reflection (optional)</span>
              {showDeeper ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDeeper && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <Textarea
                  value={formData.deeperReflection}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deeperReflection: e.target.value,
                    })
                  }
                  placeholder="What's on your mind? What felt hard? What did you avoid? Were you proud of your output?"
                  rows={6}
                  className="bg-card resize-none"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formData.deeperReflection.length} characters
                  </span>
                  <div className="flex items-center gap-1.5 text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>AI will analyze this entry</span>
                  </div>
                </div>
                <Link
                  to={`/app/projects/${id}/reflection`}
                  className="block text-sm text-primary hover:underline"
                >
                  Open full reflection editor →
                </Link>
              </div>
            )}
          </div>

          <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-background md:bg-transparent border-t md:border-t-0 border-border">
            <Button
              onClick={handleSubmit}
              className="w-full h-14 text-lg"
              size="lg"
              disabled={saving}
            >
              {saving ? "Saving…" : "Log Entry"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
