import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { usePostMortem } from "../../hooks/usePostMortem";
import { useProjects } from "../../hooks/useProjects";
import type { ProjectStatus } from "../../hooks/useProjects";

interface PostMortemModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  newStatus: ProjectStatus;
  onSaved: () => void;
}

export function PostMortemModal({
  open,
  onClose,
  projectId,
  newStatus,
  onSaved,
}: PostMortemModalProps) {
  const { savePostMortem } = usePostMortem(projectId);
  const { updateProjectStatus } = useProjects();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    rushed: "",
    overwhelmed: "",
    satisfaction: 0,
    scopeChanged: "",
    whyEnded: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.whyEnded.trim()) {
      setError("Closing note is required.");
      return;
    }
    setError(null);
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
      setError("Failed to save post-mortem.");
      setSaving(false);
      return;
    }
    await updateProjectStatus(projectId, newStatus);
    setSaving(false);
    onSaved();
    onClose();
  };

  const handleCancel = () => {
    setError(null);
    setFormData({
      rushed: "",
      overwhelmed: "",
      satisfaction: 0,
      scopeChanged: "",
      whyEnded: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Before you close this project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
              {error}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Completing a post-mortem helps capture patterns. Status will be set
            to: <span className="capitalize font-medium">{newStatus}</span>.
          </p>

          <div className="space-y-4">
            <Label>Was the project rushed?</Label>
            <RadioGroup
              value={formData.rushed}
              onValueChange={(v) => setFormData({ ...formData, rushed: v })}
            >
              <div className="flex gap-3">
                {["yes", "no", "somewhat"].map((o) => (
                  <label
                    key={o}
                    className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <RadioGroupItem value={o} id={`m-rushed-${o}`} />
                    <span className="capitalize text-sm">{o}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Were you overwhelmed at any point?</Label>
            <RadioGroup
              value={formData.overwhelmed}
              onValueChange={(v) =>
                setFormData({ ...formData, overwhelmed: v })
              }
            >
              <div className="flex gap-3">
                {["yes", "no", "sometimes"].map((o) => (
                  <label
                    key={o}
                    className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <RadioGroupItem value={o} id={`m-over-${o}`} />
                    <span className="capitalize text-sm">{o}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Satisfaction with outcome (1–5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, satisfaction: n })
                  }
                  className={`w-12 h-12 rounded-lg border-2 font-mono ${
                    formData.satisfaction === n
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Did scope change during the project?</Label>
            <RadioGroup
              value={formData.scopeChanged}
              onValueChange={(v) =>
                setFormData({ ...formData, scopeChanged: v })
              }
            >
              <div className="flex gap-3">
                {["yes", "no"].map((o) => (
                  <label
                    key={o}
                    className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <RadioGroupItem value={o} id={`m-scope-${o}`} />
                    <span className="capitalize text-sm">{o}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-why">
              In one sentence, why did this project end this way?
            </Label>
            <Textarea
              id="m-why"
              value={formData.whyEnded}
              onChange={(e) =>
                setFormData({ ...formData, whyEnded: e.target.value })
              }
              placeholder="Be honest and specific."
              rows={3}
              className="bg-background"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Post-Mortem"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
