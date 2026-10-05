import { cn } from "@/lib/utils";

// A fact: label, value, and classes for the value ("font-mono",
// "tabular-nums"). A null value shows `emptyLabel`, greyed.
export type Fact = {
  label: string;
  value: React.ReactNode | null;
  valueClassName?: string;
};

// Label / value list in a bordered card (facts of a master, a project, an
// artist's identity). On a section card: no frame, the facts side by side
// as far as the width allows.
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
        "in-[.section-card]:grid in-[.section-card]:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] in-[.section-card]:gap-x-6 in-[.section-card]:gap-y-4 in-[.section-card]:border-0 in-[.section-card]:p-0",
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
