"use client";

import { FactRow } from "@/components/ui/fact-row";
import type { ParamsData } from "@/lib/distribution/params-view";
import { setReleaseUpc } from "@/lib/distribution/upc-actions";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distributionJourney };

const t = fr.distributionJourney.upc;

/**
 * The UPC of the release, a row of the Paramètres de distribution: « Pas
 * encore connu · Attribué par The Orchard au dépôt » until it is typed;
 * « Modifier » checks it by the code (12 or 13 digits, its check digit)
 * and says why in red. Never blocks the confirmation.
 */
export function UpcField({ data }: { data: ParamsData }) {
  return (
    <FactRow
      label={t.label}
      value={data.upc ?? t.empty}
      source={data.upc ? t.source : t.later}
      edit={
        data.upcEditable
          ? {
              kind: "text",
              value: data.upc ?? "",
              proposal: data.upc ?? t.empty,
              optional: true,
              done: t.saved,
              onSave: (value) => setReleaseUpc(data.projectId, value),
            }
          : null
      }
    />
  );
}
