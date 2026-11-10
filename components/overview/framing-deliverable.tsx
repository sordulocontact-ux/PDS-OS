import { IconFile } from "nucleo-sharp-essential";

import { ContentCard } from "@/components/shell/content-card";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { isLocked, lowerFirst, type JourneyStep } from "@/lib/ui/journey";

const fr = { journey, projectShell };

/**
 * What the Cadrage prepares, said once before « Lancer le plan » (retour
 * d'Akili du 05/11/2026: « indiquer simplement que le livrable attendu est
 * le Brief de cadrage », rather than every workflow to come): its name, then
 * where it stands, read from the Cadrage's step « Brief de cadrage » — still
 * to write, whom it waits for, or what it gave — and « Ouvrir le Brief »
 * once it exists.
 */
export function FramingDeliverable({ brief }: { brief: JourneyStep }) {
  const t = fr.projectShell.overview.deliverable;
  const locked = isLocked(brief.status);
  const actor = brief.status === "done" ? null : brief.actor;
  const state = locked
    ? t.locked
    : brief.status === "done"
      ? brief.summary
      : actor
        ? actor.viewer
          ? t.mine(lowerFirst(actor.todo))
          : `${fr.journey.now.waitFor(actor.name)}${fr.journey.now.waitingOn(lowerFirst(actor.todo))}.`
        : brief.why;
  return (
    <ContentCard
      label={t.label}
      className="flex-col items-start gap-5 p-6 sm:flex-row sm:items-center"
    >
      <span className="grid size-13 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)]">
        <IconFile aria-hidden className="size-6" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-tertiary)]">
          {t.label}
        </p>
        <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-semibold tracking-[var(--type-display-tracking)]">
          {brief.title}
        </h2>
        {state && (
          <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-pretty text-[color:var(--text-secondary)]">
            {state}
          </p>
        )}
      </div>
      {!locked && (
        <ViewLink
          href={brief.href}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ButtonRoll>{t.open}</ButtonRoll>
        </ViewLink>
      )}
    </ContentCard>
  );
}
