import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Sparkles, Save } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useJournal } from "../../hooks/useJournal";
import { useProjects } from "../../hooks/useProjects";

const prompts = [
  "What felt hard today?",
  "What did you avoid?",
  "Were you proud of your output?",
  "What would you do differently?",
  "What surprised you?",
  "How did this session compare to your expectations?",
];

export function DeepReflection() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createEntry, updateEntry } = useJournal(id);
  const { fetchProject } = useProjects();
  const [projectName, setProjectName] = useState<string>("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftEntryIdRef = useRef<string | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (id) fetchProject(id).then((p) => setProjectName(p?.name ?? ""));
  }, [id, fetchProject]);

  const saveReflection = async (text: string) => {
    if (!id) return;
    setIsSaving(true);
    setSaveError(null);
    if (draftEntryIdRef.current) {
      const ok = await updateEntry(draftEntryIdRef.current, {
        reflection: text || null,
      });
      if (ok) setLastSaved(new Date());
      else setSaveError("Failed to save.");
    } else {
      const entry = await createEntry({
        energy_score: 0,
        confidence_score: 0,
        was_blocked: false,
        still_motivated: null,
        reflection: text || null,
        entry_mode: "deep",
      });
      if (entry) {
        draftEntryIdRef.current = entry.id;
        setLastSaved(new Date());
      } else {
        setSaveError("Failed to save.");
      }
    }
    setIsSaving(false);
  };

  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => {
      const latest = contentRef.current.trim();
      if (latest) saveReflection(latest);
    }, 10000);
    return () => clearTimeout(t);
  }, [content, id]);

  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/app/projects/${id}/checkin`)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Check-in</span>
            </button>

            <div className="flex items-center gap-3">
              {isSaving ? (
                <span className="text-xs text-muted-foreground">
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              ) : null}
              <Button
                onClick={() => saveReflection(content)}
                size="sm"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Deep Reflection</h1>
          <p className="text-muted-foreground mt-1">
            {projectName || "…"} • {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-primary mb-1">
                AI Analysis Enabled
              </h3>
              <p className="text-sm text-muted-foreground">
                Your reflection will be analyzed to identify patterns and
                generate personalized insights.
              </p>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="mb-4 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
            {saveError}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Optional Prompts
            </h3>
            <div className="mt-3 space-y-2">
              {prompts.map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newContent = content
                      ? `${content}\n\n${prompt}\n`
                      : `${prompt}\n`;
                    setContent(newContent);
                  }}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  • {prompt}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What felt hard today. What you avoided. What you were proud of. What you would do differently. (These are suggestions. Write whatever is true.)"
            className="min-h-[500px] border-0 rounded-none resize-none focus-visible:ring-0 bg-background text-base leading-relaxed p-6"
            style={{
              fontFamily: "inherit",
              lineHeight: "1.75",
            }}
          />

          <div className="border-t border-border p-4 flex items-center justify-between bg-card/50">
            <span className="text-sm text-muted-foreground font-mono">
              {wordCount} words
            </span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => navigate(`/app/projects/${id}/checkin`)}
            variant="outline"
            className="flex-1"
          >
            Back to Check-in
          </Button>
          <Button
            onClick={() => saveReflection(content)}
            className="flex-1"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Reflection
          </Button>
        </div>
      </div>
    </div>
  );
}
