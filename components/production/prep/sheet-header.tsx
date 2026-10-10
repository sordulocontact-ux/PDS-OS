import { IconChevronLeft } from "nucleo-sharp-essential";

import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProductionPhase } from "@/lib/production/phase";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";
import { productionPhaseTone } from "@/lib/ui/state-tones";

const t = fr.productionPrep;

/** The deliverable prepared, back to the Production list, its phase, and
 * the source it is built on: the Fiche Livrable handed over by the
 * Conception, else its validated version (ticket: « PO affiche la version
 * source »). */
export function SheetHeader({
  projectId,
  data,
  phase,
}: {
  projectId: string;
  data: ProductionSheetData;
  phase: ProductionPhase;
}) {
  const { fiche, newerFiche, source, newerApproved } = data.heritage;
  return (
    <header className="flex flex-col gap-3">
      <ViewLink
        href={routes.projectProduction(projectId)}
        className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <IconChevronLeft aria-hidden className="size-4" />
        {t.back}
      </ViewLink>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-display-sm font-semibold break-words">
          {data.deliverable.title}
        </h2>
        <StatusBadge tone={productionPhaseTone[phase]}>
          {t.phases[phase]}
        </StatusBadge>
      </div>
      {fiche ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {t.fiche(fiche.version)}
          </span>
          <span>{t.handedOn(formatDate(fiche.handedAt))}</span>
        </p>
      ) : (
        source && (
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t.source(source.number)}
            </span>
            {source.reviewedAt && (
              <span>
                {t.validatedBy(
                  source.reviewerName,
                  formatDate(source.reviewedAt),
                )}
              </span>
            )}
            {source.href && (
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t.openSource}
              </a>
            )}
          </p>
        )
      )}
      {newerFiche !== null && (
        <ToneCallout tone="warning">{t.newerFiche(newerFiche)}</ToneCallout>
      )}
      {!fiche && newerApproved !== null && (
        <ToneCallout tone="warning">{t.newer(newerApproved)}</ToneCallout>
      )}
    </header>
  );
}
