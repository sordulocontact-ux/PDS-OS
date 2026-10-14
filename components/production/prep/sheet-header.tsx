import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { effectiveLogistics } from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

const t = fr.productionPrep;
const j = fr.productionJourney.header;

/** The deliverable produced: back to the Production list, who produces it,
 * and what frames it — the Fiche Livrable it is built on, its envelope, the
 * shoot and the delivery aimed at (Production or Fiche values). */
export function SheetHeader({
  projectId,
  data,
}: {
  projectId: string;
  data: ProductionSheetData;
}) {
  const { fiche, newerFiche, source, newerApproved } = data.heritage;
  const kind = data.sheet?.organization.kind ?? null;
  const logistics = effectiveLogistics(data.sheet?.logistics ?? null, fiche);
  const facts = [
    fiche ? t.fiche(fiche.version) : source ? t.source(source.number) : null,
    logistics.budgetEnvelopeCents.value !== null
      ? `${j.envelope} ${formatEuros(logistics.budgetEnvelopeCents.value)}`
      : null,
    logistics.shootDate.value
      ? `${j.shoot} ${formatDate(logistics.shootDate.value)}`
      : null,
    logistics.deliveryDate.value
      ? `${j.delivery} ${formatDate(logistics.deliveryDate.value)}`
      : null,
  ].filter(Boolean);
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-baseline gap-2 text-display-sm font-medium break-words">
          <ViewLink
            href={routes.projectProduction(projectId)}
            className="rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t.back}
          </ViewLink>
          <span aria-hidden className="text-muted-foreground">
            /
          </span>
          <span>{data.deliverable.title}</span>
        </h2>
        <StatusBadge
          tone={kind === "external" ? "action" : kind ? "info" : "warning"}
        >
          {kind ? j.organization[kind] : j.organization.none}
        </StatusBadge>
      </div>
      {facts.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
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
