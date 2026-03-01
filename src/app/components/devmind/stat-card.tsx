import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, subtitle, trend }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="space-y-2">
        <div className="text-3xl font-mono">{value}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        )}
        {trend && (
          <div className={`text-sm ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
