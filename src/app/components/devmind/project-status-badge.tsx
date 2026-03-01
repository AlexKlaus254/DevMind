import { Circle, CheckCircle2, Pause, XCircle } from "lucide-react";

type ProjectStatus = "active" | "completed" | "paused" | "abandoned";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig = {
  active: {
    label: "Active",
    icon: Circle,
    className: "bg-primary/10 text-primary border-primary/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/30",
  },
  paused: {
    label: "Paused",
    icon: Pause,
    className: "bg-warning/10 text-warning border-warning/30",
  },
  abandoned: {
    label: "Abandoned",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-muted",
  },
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}
