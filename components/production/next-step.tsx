import { IconCircleCheck } from "@/components/icons";

import { buttonVariants } from "@/components/ui/button";
import { NextCard } from "@/components/ui/next-card";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { ProductionNext } from "@/lib/production/next/types";

const t = fr.productionNext;

/** « C'est à vous » or « Attendu : Maël (chef de projet) ». */
export function whoLine(next: ProductionNext): string | null {
  if (!next.who) return null;
  if (next.viewerIsWho) return t.you;
  const role = t.roles[next.who.role];
  return t.expected(
    next.who.name ? t.withRole(next.who.name, role) : t.unnamed(role),
  );
}

/**
 * The sheet's one next action, under its header on every tab (PROD-001,
 * PROD-007): what was just finished, what to do now and why, who is
 * expected, what is still missing, and one link where it is done — the
 * place it opens said before the click. Computed by lib/production/next.
 */
export function ProductionNextStep({ next }: { next: ProductionNext }) {
  const who = whoLine(next);
  return (
    <div className="flex flex-col gap-2">
      {next.done && (
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <IconCircleCheck
            aria-hidden
            className="size-4 shrink-0 text-[color:var(--tone-success-fg)]"
          />
          <span>
            {t.doneLabel} : <span className="text-foreground">{next.done}</span>
          </span>
        </p>
      )}
      <NextCard kind={next.kind} label={t.label[next.kind]} title={next.title}>
        <p className="text-sm text-pretty text-muted-foreground">{next.why}</p>
        {who && <p className="text-sm font-medium">{who}</p>}
        {next.missing.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium text-muted-foreground">
              {t.missingTitle}
            </span>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
              {next.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {next.link && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <ViewLink
              href={next.link.href}
              className={buttonVariants({
                variant:
                  next.kind === "wait" || next.kind === "done"
                    ? "outline"
                    : "default",
                className: "self-start",
              })}
            >
              {next.link.label}
            </ViewLink>
            <span className="text-caption text-muted-foreground">
              {t.opens(next.link.place)}
            </span>
          </div>
        )}
      </NextCard>
    </div>
  );
}
