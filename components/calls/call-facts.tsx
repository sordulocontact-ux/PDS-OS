import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CallFact = { label: string; value: ReactNode };

/**
 * Label / value lines of a call in its step (the proto's `.kv`): a column of
 * labels, then the values; one column on a phone. Used by the call form
 * (« Envoyé avec l'invitation », the summary), the planned call and the
 * meeting held.
 */
export function CallFacts({
  facts,
  className,
}: {
  facts: CallFact[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-2 text-body-md sm:grid-cols-[minmax(0,11.25rem)_minmax(0,1fr)]",
        className,
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="pt-0.5 text-caption text-[color:var(--text-secondary)] max-sm:pt-2">
            {fact.label}
          </dt>
          <dd className="min-w-0 font-medium break-words">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A source or a short mention after a value (« · choisi par … »). */
export function CallSource({ children }: { children: ReactNode }) {
  return (
    <span className="text-caption font-medium text-[color:var(--text-tertiary)]">
      {children}
    </span>
  );
}
