import { IconCircleInfo, IconFile } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { core };

/**
 * A document in head of its step (docs/VISION-UX.md rule 18, proto
 * `.doccard`): its file name, the line that says where it comes from, its
 * action on the right (« Voir le PDF », « Voir le modèle »), what changed
 * since the first version, then its values (`FactRows`) or what the step
 * shows of it. The same card at every step that follows the document.
 * `flat` (inside a section card, proto « Contrats », Sacha 30/10/2026): no
 * frame around it all; the file alone on a soft tile with a « PDF » mark,
 * what changed as a plain line, the values under it.
 */
export function DocumentCard({
  name,
  line,
  action,
  change,
  children,
  className,
  flat = false,
}: {
  name: string;
  line?: ReactNode;
  action?: ReactNode;
  // « Changé depuis la v1 : … ».
  change?: ReactNode;
  children?: ReactNode;
  className?: string;
  flat?: boolean;
}) {
  const head = (
    <div
      className={cn(
        "flex flex-wrap gap-3",
        flat ? "items-center" : "items-start",
        flat &&
          "rounded-xl border border-[color:var(--border-default)] bg-[var(--surface-soft)] p-3.5",
      )}
    >
      {flat ? (
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-md border border-[color:var(--border-default)] bg-card text-[length:var(--type-caption)] font-semibold text-[color:var(--text-secondary)]"
        >
          {fr.core.documentCard.pdf}
        </span>
      ) : (
        <IconFile
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-[color:var(--text-secondary)]"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <b className={cn("font-semibold", flat ? "break-words" : "break-all")}>
          {name}
        </b>
        {line && (
          <span
            className={cn(
              "text-[color:var(--text-secondary)]",
              flat
                ? "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]"
                : "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)]",
            )}
          >
            {line}
          </span>
        )}
      </span>
      {action}
    </div>
  );

  if (flat)
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {head}
        {change && (
          <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
            {change}
          </p>
        )}
        {children}
      </div>
    );

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[color:var(--border-default)] p-4",
        className,
      )}
    >
      {head}
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
