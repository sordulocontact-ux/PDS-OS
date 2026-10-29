import { PageSection } from "@/components/shell/page-section";
import { calls } from "@/lib/i18n/fr/calls";
import { conceptionCall } from "@/lib/i18n/fr/conception-call";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { productionCall } from "@/lib/i18n/fr/production-call";
import { strategyEntry } from "@/lib/i18n/fr/strategy-entry";
import type { CallDetail } from "@/lib/calls/queries";

const fr = {
  calls,
  framingIntel,
  strategyEntry,
  conceptionCall,
  productionCall,
};

/**
 * What a call prepared with « Préparer un échange » is for (Cadrage,
 * Stratégie, Conception or Production): purpose, format, participants, documents, the
 * deliverables of a creative exchange.
 */
export function PreparedCallDetails({
  prepared,
}: {
  prepared: NonNullable<CallDetail["prepared"]>;
}) {
  const framing = fr.framingIntel.call;
  const strategy = fr.strategyEntry.call;
  const design = fr.conceptionCall;
  const isStrategy = prepared.kind === "strategy";
  const isDesign = prepared.kind === "design";
  const isProduction = prepared.kind === "production";
  const rows = [
    {
      label:
        isStrategy || isDesign || isProduction
          ? strategy.detailsPurpose
          : framing.detailsPurpose,
      value: prepared.purpose,
    },
    prepared.format && {
      label: strategy.detailsFormat,
      value: strategy.formats[prepared.format],
    },
    prepared.deliverables.length > 0 && {
      label: isProduction
        ? fr.productionCall.detailsDeliverable
        : design.detailsDeliverables,
      value: prepared.deliverables.join(", "),
    },
    prepared.participants.length > 0 && {
      label: fr.calls.prepare.participants,
      value: prepared.participants.join(", "),
    },
    prepared.documents.length > 0 && {
      label: framing.documents,
      value: prepared.documents.map((d) => d.name).join(", "),
    },
  ].filter((row) => row !== false && row !== null);

  return (
    <PageSection
      id="call-prepared"
      title={
        isProduction
          ? fr.productionCall.detailsTitle
          : isDesign
            ? design.detailsTitle
            : isStrategy
              ? strategy.detailsTitle
              : framing.detailsTitle
      }
      card
    >
      <div className="grid gap-2 text-sm">
        {rows.map((row) => (
          <p key={row.label}>
            <span className="text-muted-foreground">{row.label} : </span>
            {row.value}
          </p>
        ))}
      </div>
    </PageSection>
  );
}
