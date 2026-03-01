interface NumberSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function NumberSelector({ value, onChange, min = 1, max = 10 }: NumberSelectorProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {numbers.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-12 h-12 rounded-lg border-2 font-mono transition-all ${
            value === num
              ? "border-primary bg-primary text-primary-foreground scale-110"
              : "border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground"
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  );
}
