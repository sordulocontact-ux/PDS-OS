"use client";

import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ViewLink } from "@/components/ui/view-link";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type { ValueFix } from "@/lib/legal/contracts/fix";
import type { AgreementField } from "@/lib/legal/contracts/mapping";
import { contractValueTone } from "@/lib/ui/state-tones";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { legalContracts };

/**
 * The values of a contract as the proto's document shows them (Sacha,
 * 06/11/2026), keeping all JUR-16 asks: one fact row per value — its label
 * with « * » when required (the forms' convention, not « · Obligatoire »),
 * the value, then its source or, while it blocks, who provides it; a pill
 * for any state but filled (missing, invalid, to check, waiting for the
 * fiche, not applicable); the gesture that fixes it where it lives
 * (`fix`), or the fee changed on its line (`fee`) before generation.
 */
export function ContractValueRows({
  fields,
  personName,
  fix,
  fee,
  className,
}: {
  fields: AgreementField[];
  personName: string;
  fix?: (field: AgreementField) => ValueFix;
  // The fee, changed in place (« Contrats à prévoir »), before generation.
  fee?: { value: string; onSave: (value: string) => Promise<WriteResult> };
  // « rounded-none border-0 » inside a DocumentCard.
  className?: string;
}) {
  const c = fr.legalContracts.checklist;
  const t = fr.legalContracts;
  return (
    <FactRows className={className}>
      {fields.map((field) => {
        const blocking = isBlocking(field.status);
        const who =
          field.provider === "person"
            ? c.provider.person(personName)
            : c.provider[field.provider];
        // The value's origin; while it blocks, who provides it and why.
        const source = blocking
          ? [c.statusHint[field.status], who].filter(Boolean).join(" · ")
          : field.status === "filled"
            ? field.source && t.sources[field.source]
            : (c.statusHint[field.status] ?? null);
        const state =
          field.status === "filled"
            ? null
            : {
                tone: contractValueTone[field.status],
                label: c.status[field.status],
              };
        const target = blocking ? fix?.(field) : null;
        const row = {
          label: field.label,
          required: field.required,
          value: field.value,
          missing: !field.value,
          missingAs: "badge" as const,
          state,
          source: source || null,
        };
        if (field.id === "remuneration" && fee)
          return (
            <FactRow
              key={field.id}
              {...row}
              openOnRow
              edit={{
                kind: "text",
                value: fee.value,
                optional: true,
                done: c.feeSaved,
                onSave: fee.onSave,
              }}
            />
          );
        return (
          <FactRow
            key={field.id}
            {...row}
            side={
              target && (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<ViewLink href={target.href} />}
                >
                  {target.label}
                </Button>
              )
            }
          />
        );
      })}
    </FactRows>
  );
}
