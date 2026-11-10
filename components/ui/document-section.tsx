import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DocumentLine = {
  key: string;
  label: string;
  value: ReactNode;
  // Where it comes from, or what it weighs on, in small under the value.
  source?: ReactNode;
};

/**
 * One section of a document read in its card (`BriefDocument`): its name,
 * then « libellé | valeur » with the source under the value, a hairline
 * above the next section. `marked`: on a warning ground (a dimension sent
 * back, what stays to arbitrate). `aside`: a pill or a toggle on the right.
 * The Brief de cadrage and the Brief de sortie read the same way (Sacha
 * 09/11/2026: « les patterns doivent être pareils partout »).
 */
export function DocumentSection({
  id,
  title,
  lines,
  marked = false,
  aside,
}: {
  id: string;
  title: string;
  lines: DocumentLine[];
  marked?: boolean;
  aside?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-2 border-t border-[color:var(--border-hairline)] py-3.5 first:border-t-0 first:pt-1",
        marked &&
          "-mx-2.5 rounded-lg border-t-transparent bg-[var(--tone-warning-bg)] px-2.5",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={id} className="text-body-md font-semibold">
          {title}
        </h4>
        {aside}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-body-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        {lines.map((line) => (
          <div key={line.key} className="contents">
            <dt className="text-[color:var(--text-secondary)]">{line.label}</dt>
            <dd className="mb-1.5 flex min-w-0 flex-col break-words sm:mb-0">
              <span className="whitespace-pre-line">{line.value}</span>
              {line.source && (
                <span className="text-caption text-[color:var(--text-tertiary)]">
                  {line.source}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
