import { IconCircleInfo, IconFile } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A document in head of its step (docs/VISION-UX.md rule 18, proto
 * `.doccard`): its file name, the line that says where it comes from, its
 * action on the right (« Voir le PDF », « Voir le modèle »), what changed
 * since the first version, then its values (`FactRows`) or what the step
 * shows of it. The same card at every step that follows the document.
 */
export function DocumentCard({
  name,
  line,
  action,
  change,
  children,
  className,
}: {
  name: string;
  line?: ReactNode;
  action?: ReactNode;
  // « Changé depuis la v1 : … ».
  change?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[color:var(--border-default)] p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <IconFile
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-[color:var(--text-secondary)]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="font-semibold break-all">{name}</b>
          {line && (
            <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
              {line}
            </span>
          )}
        </span>
        {action}
      </div>
      {change && (
        <p className="flex items-start gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[length:var(--type-body-sm)]">
          <IconCircleInfo
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-[color:var(--text-secondary)]"
          />
          <span className="min-w-0">{change}</span>
        </p>
      )}
      {children}
    </section>
  );
}
