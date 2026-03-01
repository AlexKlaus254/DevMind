import { Sparkles } from "lucide-react";

interface AIInsightCardProps {
  insight: string;
  confidence?: number;
}

export function AIInsightCard({ insight, confidence = 85 }: AIInsightCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-lg p-6">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
      
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary font-mono">AI INSIGHT</span>
            <span className="text-xs text-muted-foreground">{confidence}% confidence</span>
          </div>
          <p className="text-foreground leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
