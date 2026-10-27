import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { productionJourney } from "@/lib/i18n/fr/production-journey";
import { productionPrep } from "@/lib/i18n/fr/production-prep";
import { effectiveLogistics } from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { formatDay } from "@/lib/utils/day";

const fr = { productionPrep, productionJourney };

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

/** Who produces the deliverable, next to « Qui fait quoi » (proto:
 * « Clip officiel · Externe · Studio Ressac »). */
export function SheetKindBadge({ data }: { data: ProductionSheetData }) {
  const org = data.sheet?.organization ?? null;
  if (!org?.kind) return null;
  return (
    <StatusBadge tone="neutral">
      {[
        data.deliverable.title,
        j.organization[org.kind],
        org.kind === "external" ? org.company?.name : null,
      ]
        .filter(Boolean)
        .join(" · ")}
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
