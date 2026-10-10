"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { fr } from "@/lib/i18n/fr";

const STATES = ["selected", "to_decide", "rejected"] as const;
export type LeverState = (typeof STATES)[number];

/**
 * The three states of a lever side by side — Retenu, À arbitrer, Non
 * retenu —, the current one pressed: visible at a glance, one click to
 * change. The database refuses to unselect a lever that carries
 * deliverables (lever_has_deliverables).
 */
export function LeverStateControl({
  lever,
  value,
  disabled,
  onChange,
}: {
  // The lever's label, to name the group.
  lever: string;
  value: LeverState;
  disabled: boolean;
  onChange: (state: LeverState) => void;
}) {
  const t = fr.strategyDispositif;
  return (
    <div
      role="group"
      aria-label={t.stateLabel(lever)}
      className="flex flex-wrap gap-1.5"
    >
      {STATES.map((state) => (
        <FilterChip
          key={state}
          variant="soft"
          pressed={value === state}
          disabled={disabled}
          onClick={() => value !== state && onChange(state)}
        >
          {fr.strategy.levers.states[state]}
        </FilterChip>
      ))}
    </div>
  );
}
