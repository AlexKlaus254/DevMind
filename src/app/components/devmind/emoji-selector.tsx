import { useState } from "react";

interface EmojiSelectorProps {
  value: number;
  onChange: (value: number) => void;
  emojis: string[];
  labels?: string[];
}

export function EmojiSelector({ value, onChange, emojis, labels }: EmojiSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index + 1)}
            className={`flex-1 h-16 rounded-lg border-2 transition-all ${
              value === index + 1
                ? "border-primary bg-primary/10 scale-110"
                : "border-border bg-card hover:border-primary/50 hover:bg-muted"
            }`}
          >
            <span className="text-3xl">{emoji}</span>
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}
