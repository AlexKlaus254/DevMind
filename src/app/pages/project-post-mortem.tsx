import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import { AIInsightCard } from "../components/devmind/ai-insight-card";
import { usePostMortem } from "../../hooks/usePostMortem";
import { useProjects } from "../../hooks/useProjects";
import type { ProjectStatus } from "../../hooks/useProjects";

const satisfactionEmojis = ["😞", "😐", "🙂", "😊", "🤩"];

export function ProjectPostMortem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { savePostMortem, postMortem, getPostMortem } = usePostMortem(id);
  const { updateProjectStatus, fetchProject } = useProjects();
  const [projectName, setProjectName] = useState("");
  const [showAISummary, setShowAISummary] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: "" as ProjectStatus | "",
    rushed: "",
    overwhelmed: "",
    satisfaction: 0,
    scopeChanged: "",
    whyEnded: "",
  });

  useEffect(() => {
    if (id) fetchProject(id).then((p) => setProjectName(p?.name ?? ""));
  }, [id, fetchProject]);

  useEffect(() => {
    if (postMortem) setShowAISummary(true);
  }, [postMortem]);

  const handleSubmit = async () => {
    if (!id || !formData.status || !formData.whyEnded.trim()) {
      setSaveError("Status and closing note are required.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    const ok = await savePostMortem({
      was_rushed: formData.rushed || null,
      was_overwhelmed: formData.overwhelmed || null,
      satisfaction_score:
        formData.satisfaction > 0 ? formData.satisfaction : null,
      scope_changed:
        formData.scopeChanged === "yes"
          ? true
          : formData.scopeChanged === "no"
            ? false
            : null,
      closing_note: formData.whyEnded.trim(),
    });
    if (!ok) {
      setSaveError("Failed to save post-mortem.");
      setSaving(false);
      return;
    }
    const statusOk = await updateProjectStatus(id, formData.status);
    if (!statusOk) {
      setSaveError("Failed to update project status.");
    }
    setShowAISummary(true);
    setSaving(false);
    await getPostMortem();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate("/app/projects")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </button>
          <h1 className="text-2xl font-semibold">Project Post-Mortem</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projectName || "…"} • Reflect on the journey
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {saveError && (
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {saveError}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">Final status</Label>
          <RadioGroup
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as ProjectStatus | "" })
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["completed", "abandoned", "paused"] as const).map((status) => (
                <label
                  key={status}
                  className={`flex items-center space-x-2 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.status === status
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={status} id={status} />
                  <Label htmlFor={status} className="cursor-pointer capitalize">
                    {status === "paused" ? "Paused Indefinitely" : status}
                  </Label>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">Was the project rushed?</Label>
          <RadioGroup
            value={formData.rushed}
            onValueChange={(value) =>
              setFormData({ ...formData, rushed: value })
            }
          >
            <div className="flex gap-3">
              {["yes", "no", "somewhat"].map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    formData.rushed === option
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option} id={`rushed-${option}`} />
                  <Label
                    htmlFor={`rushed-${option}`}
                    className="cursor-pointer capitalize"
                  >
                    {option}
                  </Label>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">
            Were you overwhelmed at any point?
          </Label>
          <RadioGroup
            value={formData.overwhelmed}
            onValueChange={(value) =>
              setFormData({ ...formData, overwhelmed: value })
            }
          >
            <div className="flex gap-3">
              {["yes", "no", "sometimes"].map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    formData.overwhelmed === option
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem
                    value={option}
                    id={`overwhelmed-${option}`}
                  />
                  <Label
                    htmlFor={`overwhelmed-${option}`}
                    className="cursor-pointer capitalize"
                  >
                    {option}
                  </Label>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">Satisfaction with outcome</Label>
          <div className="flex gap-2">
            {satisfactionEmojis.map((_emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, satisfaction: index + 1 })
                }
                className={`flex-1 h-20 rounded-lg border-2 transition-all ${
                  formData.satisfaction === index + 1
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-4xl">
                  {satisfactionEmojis[index]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Not at all</span>
            <span>Very satisfied</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">
            Did scope change during the project?
          </Label>
          <RadioGroup
            value={formData.scopeChanged}
            onValueChange={(value) =>
              setFormData({ ...formData, scopeChanged: value })
            }
          >
            <div className="flex gap-3">
              {["yes", "no"].map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    formData.scopeChanged === option
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option} id={`scope-${option}`} />
                  <Label
                    htmlFor={`scope-${option}`}
                    className="cursor-pointer capitalize"
                  >
                    {option}
                  </Label>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label htmlFor="whyEnded" className="text-base">
            In one sentence, why did this project end this way?
          </Label>
          <Textarea
            id="whyEnded"
            value={formData.whyEnded}
            onChange={(e) =>
              setFormData({ ...formData, whyEnded: e.target.value })
            }
            placeholder="Be honest and specific..."
            rows={3}
            className="bg-background resize-none"
            required
          />
        </div>

        {showAISummary && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">AI-Generated Pattern Summary</h3>
            </div>
            {postMortem?.ai_summary ? (
              <AIInsightCard
                insight={postMortem.ai_summary}
                confidence={85}
              />
            ) : (
              <AIInsightCard
                insight="Pattern summary generating. Check insights shortly."
                confidence={0}
              />
            )}
          </div>
        )}

        <div className="sticky bottom-0 bg-background pt-4 pb-4 border-t border-border -mx-6 px-6">
          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={saving}
          >
            {showAISummary ? "Complete Post-Mortem" : "Save Post-Mortem"}
          </Button>
        </div>
      </div>
    </div>
  );
}
