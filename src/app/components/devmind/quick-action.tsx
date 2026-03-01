import { LucideIcon } from "lucide-react";
import { Link } from "react-router";

interface QuickActionProps {
  to: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

export function QuickAction({ to, icon: Icon, label, description }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">{label}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
