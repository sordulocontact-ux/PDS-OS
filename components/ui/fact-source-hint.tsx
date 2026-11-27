"use client";

import { IconCircleInfo } from "nucleo-sharp-essential";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Where a fact comes from, as a quiet icon on the right of its row, the
 * words in a tooltip (Sacha, 27/11/2026: « Crédits du titre », « Réseau »
 * under every value were noise). Focusable for the keyboard unless the row
 * itself is the button or the link (`inert`): its words are then read with
 * the row.
 */
export function FactSourceHint({
  label,
  inert = false,
}: {
  label: string;
  inert?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={inert ? undefined : 0}
            aria-label={label}
            className="inline-flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-tertiary)] outline-none hover:text-[color:var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring)]"
          />
        }
      >
        <IconCircleInfo aria-hidden className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
