"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { deals } from "@/lib/i18n/fr/deals";
import { loadContactOptions } from "@/lib/network/actions";

const fr = { deals };

/**
 * Who a label or brand deal is negotiated with (Ibé 18/11/2026): an
 * organization of the Réseau, searched, or added to it without leaving the
 * form — never a name typed alone. Submitted as `counterpartId`; `onPick`
 * tells the form the id chosen ("" for none).
 */
export function DealCounterpartField({
  kind,
  error,
  onPick,
}: {
  kind: "label" | "brand_partnership";
  error?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div id="new-deal-counterpart">
      <PersonPickerField
        refName="counterpartId"
        nameName="counterpartName"
        legend={fr.deals.create.counterpart[kind]}
        load={async () =>
          (await loadContactOptions()).organizations.map((o) => ({
            id: o.id,
            label: o.name,
          }))
        }
        defaultRef={null}
        defaultName={null}
        createRoles={[kind === "label" ? "label" : "company"]}
        createKind="organization"
        refOfContact={(id) => id}
        onPick={(option) => onPick(option?.id ?? "")}
        allowNameOnly={false}
        required
        error={error}
      />
    </div>
  );
}
