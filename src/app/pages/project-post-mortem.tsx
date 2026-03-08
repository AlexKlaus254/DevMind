import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import { AIInsightCard } from "../components/devmind/ai-insight-card";
import { usePostMortem } from "../../hooks/usePostMortem";
import { useProjects } from "../../hooks/useProjects";
import type { ProjectStatus } from "../../hooks/useProjects";
import { parseSupabaseError } from "../../lib/errorHandler";

const satisfactionEmojis = ["😞", "😐", "🙂", "😊", "🤩"];

export function ProjectPostMortem() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const location = useLocation();
  const { savePostMortem, postMortem, getPostMortem } = usePostMortem(projectId);
  const { updateProjectStatus, fetchProject } = useProjects();

  const [projectName, setProjectName] = useState("");
  const [showAISummary, setShowAISummary] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [wasRushed, setWasRushed] = useState<
    "yes" | "no" | "somewhat" | ""
  >("");
  const [wasOverwhelmed, setWasOverwhelmed] = useState<
    "yes" | "no" | "sometimes" | ""
  >("");
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [scopeChanged, setScopeChanged] = useState<boolean | null>(null);
  const [closingNote, setClosingNote] = useState("");
  const [finalStatus, setFinalStatus] = useState<
    "completed" | "abandoned" | "paused" | ""
  >("");

  const targetStatusFromState =
    (location.state as { targetStatus?: ProjectStatus } | null)
      ?.targetStatus ?? null;

  useEffect(() => {
    let mounted = true;
    if (projectId) {
      fetchProject(projectId).then((p) => {
        if (mounted) setProjectName(p?.name ?? "");
      });
    }
    return () => {
      mounted = false;
    };
  }, [projectId, fetchProject]);

  useEffect(() => {
    if (postMortem) setShowAISummary(true);
  }, [postMortem]);

  useEffect(() => {
    if (targetStatusFromState) {
      setFinalStatus(targetStatusFromState);
    }
  }, [targetStatusFromState]);

  const onSubmit = async () => {
    if (submitting) return;

    if (!finalStatus) {
      setSaveError("Select a final status.");
      return;
    }
    if (!closingNote.trim()) {
      setSaveError("Closing note is required.");
      return;
    }
    if (satisfaction === null || satisfaction < 1 || satisfaction > 5) {
      setSaveError("Select a satisfaction score.");
      return;
    }

    setSubmitting(true);
    setSaveError(null);

    try {
      const result = await savePostMortem({
        was_rushed: wasRushed || null,
        was_overwhelmed: wasOverwhelmed || null,
        satisfaction_score: satisfaction,
        scope_changed: scopeChanged ?? false,
        closing_note: closingNote.trim(),
      });

      if (!result.ok) {
        setSaveError(result.error ?? "Failed to save post-mortem.");
        setSubmitting(false);
        return;
      }

      const statusOk = await updateProjectStatus(projectId!, finalStatus);
      if (!statusOk) {
        setSaveError("Failed to update project status.");
        setSubmitting(false);
        return;
      }

      const key = `devmind:pending-postmortem:${projectId}`;
      localStorage.removeItem(key);
      setShowAISummary(true);
      setSubmitting(false);
      setSuccess(true);
      await getPostMortem();
      setTimeout(() => {
        navigate("/app/projects");
      }, 1200);
    } catch (e) {
      setSaveError(parseSupabaseError(e as Parameters<typeof parseSupabaseError>[0]));
      setSubmitting(false);
    }
  };

  const statusDisabled = !!targetStatusFromState;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <button
            onClick={() => {
              if (projectId) {
                navigate(`/app/projects/${projectId}`);
              } else {
                navigate("/app/projects");
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to project</span>
          </button>
          <h1 className="text-2xl font-semibold">Project Post-Mortem</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projectName || "…"} • Reflect on the journey
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {success && (
          <div className="text-sm rounded-md border border-success/30 bg-success/10 text-success px-4 py-3">
            Post-mortem saved. Returning to project.
          </div>
        )}

        {saveError && (
          <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {saveError}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <Label className="text-base">Final status</Label>
          <RadioGroup
            value={finalStatus}
            onValueChange={(value) =>
              setFinalStatus(value as "completed" | "abandoned" | "paused" | "")
            }
            disabled={statusDisabled}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["completed", "abandoned", "paused"] as const).map((status) => (
                <label
                  key={status}
                  className={`flex items-center space-x-2 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    finalStatus === status
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  } ${statusDisabled ? "opacity-70" : ""}`}
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
            value={wasRushed}
            onValueChange={(value) =>
              setWasRushed(value as "yes" | "no" | "somewhat" | "")
            }
          >
            <div className="flex gap-3">
              {(["yes", "no", "somewhat"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    wasRushed === option
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
            value={wasOverwhelmed}
            onValueChange={(value) =>
              setWasOverwhelmed(value as "yes" | "no" | "sometimes" | "")
            }
          >
            <div className="flex gap-3">
              {(["yes", "no", "sometimes"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    wasOverwhelmed === option
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
                onClick={() => setSatisfaction(index + 1)}
                className={`flex-1 h-20 rounded-lg border-2 transition-all ${
                  satisfaction === index + 1
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
            value={
              scopeChanged === null
                ? ""
                : scopeChanged
                  ? "yes"
                  : "no"
            }
            onValueChange={(value) =>
              setScopeChanged(value === "yes" ? true : value === "no" ? false : null)
            }
          >
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    scopeChanged === (option === "yes")
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
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
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
            onClick={onSubmit}
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : success
                ? "Returning to project…"
                : showAISummary
                  ? "Complete Post-Mortem"
                  : "Save Post-Mortem"}
          </Button>
        </div>
      </div>
    </div>
  );
}
