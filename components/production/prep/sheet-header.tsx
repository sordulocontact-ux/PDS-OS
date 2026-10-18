import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { effectiveLogistics } from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { formatDay } from "@/lib/utils/day";

const t = fr.productionPrep;
const j = fr.productionJourney.header;

/** What frames the deliverable produced, as the facts of the module's header
 * (ModuleHeader): the Fiche Livrable it is built on, its envelope, the shoot
 * and the delivery aimed at (Production or Fiche values), said in full. */
export function sheetFacts(data: ProductionSheetData): ModuleFact[] {
  const { fiche, source } = data.heritage;
  const logistics = effectiveLogistics(data.sheet?.logistics ?? null, fiche);
  const facts: ModuleFact[] = [
    {
      key: "deliverable",
      value: [
        data.deliverable.title,
        fiche
          ? t.fiche(fiche.version)
          : source
            ? t.source(source.number)
            : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
  ];
  if (logistics.budgetEnvelopeCents.value !== null)
    facts.push({
      key: "envelope",
      label: j.envelope,
      value: formatEuros(logistics.budgetEnvelopeCents.value),
    });
  if (logistics.shootDate.value)
    facts.push({
      key: "shoot",
      label: j.shoot,
      value: formatDay(logistics.shootDate.value),
    });
  if (logistics.deliveryDate.value)
    facts.push({
      key: "delivery",
      label: j.delivery,
      value: formatDay(logistics.deliveryDate.value),
    });
  return facts;
}

/** Who produces the deliverable, next to the module's title. */
export function SheetKindBadge({ data }: { data: ProductionSheetData }) {
  const kind = data.sheet?.organization.kind ?? null;
  return (
    <StatusBadge
      tone={kind === "external" ? "action" : kind ? "info" : "warning"}
    >
      {kind ? j.organization[kind] : j.organization.none}
    </StatusBadge>
  );
}

/** A newer Fiche or source version than the one the production is built on. */
export function SheetNotices({ data }: { data: ProductionSheetData }) {
  const { fiche, newerFiche, newerApproved } = data.heritage;
  if (newerFiche !== null)
    return <ToneCallout tone="warning">{t.newerFiche(newerFiche)}</ToneCallout>;
  if (!fiche && newerApproved !== null)
    return <ToneCallout tone="warning">{t.newer(newerApproved)}</ToneCallout>;
  return null;
}
