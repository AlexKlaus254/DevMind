import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { useProjects } from "../../hooks/useProjects";

export function NewProject() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    solo: true,
    hasDeadline: false,
    techStack: "",
    energy: 5,
    confidence: 5,
    tiedToIncome: false,
    motivation: "",
    skillToImprove: "",
    successDefinition: "",
    abandonmentRisk: "",
    deadlineDate: "",
    understood: false,
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!formData.successDefinition.trim() || !formData.abandonmentRisk.trim()) {
      setSubmitError("Success definition and abandonment risk are required.");
      return;
    }
    if (!formData.understood) return;
    setSubmitError(null);
    setSaving(true);
    const techStack = formData.techStack
      ? formData.techStack
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const project = await createProject({
      name: formData.name,
      description: formData.description || null,
      type: formData.type || null,
      is_solo: formData.solo,
      has_deadline: formData.hasDeadline || !!formData.deadlineDate,
      deadline_date: formData.deadlineDate || null,
      tech_stack: techStack.length > 0 ? techStack : undefined,
      motivation: formData.motivation || null,
      skill_to_improve: formData.skillToImprove || null,
      success_definition: formData.successDefinition.trim() || null,
      abandonment_risk: formData.abandonmentRisk.trim() || null,
    });
    setSaving(false);
    if (project) {
      navigate(`/app/projects/${project.id}`);
    } else {
      setSubmitError("Failed to create project. Try again.");
    }
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
          <h1 className="text-2xl font-semibold">New Project Setup</h1>

          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-1 flex-1 rounded-full ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
                {s < 3 && (
                  <span className="text-xs text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Step {step} of 3
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          {submitError && (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
              {submitError}
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">Project Basics</h2>
                <p className="text-sm text-muted-foreground">
                  Tell us about what you're building
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="My Awesome Project"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What is this project about?"
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type" className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="opensource">Open Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="solo">Working Solo?</Label>
                  <p className="text-sm text-muted-foreground">
                    Are you working on this alone?
                  </p>
                </div>
                <Switch
                  id="solo"
                  checked={formData.solo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, solo: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deadline">Has Deadline?</Label>
                  <p className="text-sm text-muted-foreground">
                    Does this project have a deadline?
                  </p>
                </div>
                <Switch
                  id="deadline"
                  checked={formData.hasDeadline}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasDeadline: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="techStack">Tech Stack (comma separated)</Label>
                <Input
                  id="techStack"
                  value={formData.techStack}
                  onChange={(e) =>
                    setFormData({ ...formData, techStack: e.target.value })
                  }
                  placeholder="React, TypeScript, Node.js"
                  className="bg-background"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Psychological Baseline
                </h2>
                <p className="text-sm text-muted-foreground">
                  How are you feeling going into this project?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Energy Level</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    How energized do you feel about starting this?
                  </p>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.energy]}
                      onValueChange={([value]) =>
                        setFormData({ ...formData, energy: value })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Drained (1)</span>
                      <span className="font-mono text-primary">
                        {formData.energy}/10
                      </span>
                      <span>Energized (10)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Confidence Level</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    How confident are you in completing this?
                  </p>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.confidence]}
                      onValueChange={([value]) =>
                        setFormData({ ...formData, confidence: value })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low (1)</span>
                      <span className="font-mono text-primary">
                        {formData.confidence}/10
                      </span>
                      <span>High (10)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="income">Tied to Income?</Label>
                  <p className="text-sm text-muted-foreground">
                    Does this project directly affect your income?
                  </p>
                </div>
                <Switch
                  id="income"
                  checked={formData.tiedToIncome}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, tiedToIncome: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Main Motivation</Label>
                <Select
                  value={formData.motivation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, motivation: value })
                  }
                >
                  <SelectTrigger id="motivation" className="bg-background">
                    <SelectValue placeholder="What's driving you?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="money">Money</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="passion">Passion</SelectItem>
                    <SelectItem value="obligation">Obligation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Accountability contract
                </h2>
                <p className="text-sm text-muted-foreground">
                  Define success and risk so we can track patterns.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="success">
                  What does success look like for this project? (required)
                </Label>
                <Input
                  id="success"
                  value={formData.successDefinition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      successDefinition: e.target.value,
                    })
                  }
                  placeholder="e.g., Ship v1 and get 10 users"
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abandon">
                  What is most likely to make you abandon this? (required)
                </Label>
                <Input
                  id="abandon"
                  value={formData.abandonmentRisk}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      abandonmentRisk: e.target.value,
                    })
                  }
                  placeholder="e.g., Losing motivation when stuck"
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadlineDate">Set a personal deadline (optional)</Label>
                <Input
                  id="deadlineDate"
                  type="date"
                  value={formData.deadlineDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deadlineDate: e.target.value })
                  }
                  className="bg-background"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Your silence on this project will be recorded. Abandoned
                projects remain visible in your history. All patterns will
                appear in your insights.
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="understood"
                  checked={formData.understood}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      understood: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="understood"
                  className="text-sm font-normal cursor-pointer leading-tight"
                >
                  I understand and accept this
                </Label>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-border">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={saving}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={saving || !formData.understood}
              >
                {saving
                  ? "Saving…"
                  : !formData.understood
                    ? "You must acknowledge this to proceed."
                    : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
