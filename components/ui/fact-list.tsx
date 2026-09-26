import { cn } from "@/lib/utils";

// A fact: label, value, and classes for the value ("font-mono",
// "tabular-nums"). A null value shows `emptyLabel`, greyed.
export type Fact = {
  label: string;
  value: React.ReactNode | null;
  valueClassName?: string;
};

// Label / value list in a bordered card (facts of a master, a project, an
// artist's identity).
export function FactList({
  facts,
  emptyLabel,
  className,
}: {
  facts: Fact[];
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border p-4 text-sm",
        className,
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd
            className={
              fact.value === null
                ? "text-muted-foreground"
                : cn("font-medium break-words", fact.valueClassName)
            }
          >
            {fact.value ?? emptyLabel}
          </dd>
        </div>
      ))}
    </dl>
  );
}
