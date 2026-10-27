"use client";

import { IconFile, IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distributionJourney };

/** A proof chosen for a declaration: its name, and the cross that removes
 * it (proto `.pf`). */
export function ProofChip({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]">
      <IconFile aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={fr.distributionJourney.deposit.removeProof}
        onClick={onRemove}
      >
        <IconXmark aria-hidden />
      </Button>
    </span>
  );
}
