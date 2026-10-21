import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { Blocker } from "@/lib/ui/journey";
import { cn } from "@/lib/utils";

/**
 * What stops an action (retour « Néons » 05): each reason on its line, with
 * « Résoudre le blocage » to the place where it is lifted; `title` heads a
 * list, `then` says how the action resumes once lifted.
 */
export function BlockerCallout({
  blockers,
  title,
  then,
}: {
  blockers: Blocker[];
  title?: string;
  then?: string;
}) {
  if (blockers.length === 0) return null;
  return (
    <ToneCallout tone="warning" as="div" contentClassName="flex flex-col gap-2">
      {title && <span className="font-semibold">{title}</span>}
      {blockers.map((b) => (
        <span
          key={b.text}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5"
        >
          <span className="min-w-0 flex-1 basis-60">{b.text}</span>
          {b.href && (
            <ViewLink
              href={b.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {fr.journey.resolveBlocker}
            </ViewLink>
          )}
        </span>
      ))}
      {then && <span>{then}</span>}
    </ToneCallout>
  );
}
