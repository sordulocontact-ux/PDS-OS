"use client";

import { OptionSelect } from "@/components/projects/option-select";
import { FilterChip } from "@/components/ui/filter-chip";
import type { DeliverableFormat } from "@/lib/design/formats";
import {
  CHOSEN_REFERENCE_TYPES,
  REFERENCE_USAGES,
} from "@/lib/design/reference-kinds";
import { fr } from "@/lib/i18n/fr";

export type ChosenType = (typeof CHOSEN_REFERENCE_TYPES)[number];

/**
 * What an element is and how it may be used (MKT-C2-09): « Référence » or
 * « Moodboard », each with its short definition and an example fitting the
 * deliverable's format, then its rights of use. Submitted as `usage`.
 */
export function ReferenceKindFields({
  type,
  onTypeChange,
  usage,
  format = "other",
  disabled,
}: {
  type: ChosenType;
  onTypeChange: (type: ChosenType) => void;
  usage: string | null;
  // The deliverable it is added from: its examples.
  format?: DeliverableFormat;
  disabled?: boolean;
}) {
  const t = fr.conceptionKinds;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t.typeLabel}</span>
        <div role="group" aria-label={t.typeLabel} className="flex gap-2">
          {CHOSEN_REFERENCE_TYPES.map((key) => (
            <FilterChip
              key={key}
              pressed={type === key}
              disabled={disabled}
              onClick={() => onTypeChange(key)}
            >
              {t.types[key]}
            </FilterChip>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {t.definitions[type]} {t.example(t.examples[format][type])}
        </p>
      </div>
      <OptionSelect
        id="reference-usage"
        name="usage"
        label={t.usageLabel}
        items={Object.fromEntries(
          REFERENCE_USAGES.map((u) => [u, t.usages[u]]),
        )}
        defaultValue={usage}
      />
    </div>
  );
}
