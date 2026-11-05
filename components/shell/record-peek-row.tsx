"use client";

import { RecordPeekDialog } from "@/components/shell/record-peek-dialog";
import { FactRowDialog } from "@/components/ui/fact-row-dialog";
import type { FactRowProps } from "@/components/ui/fact-row-frame";
import { peek } from "@/lib/i18n/fr/peek";
import type { PeekTarget } from "@/lib/peek/types";

const fr = { peek };

/** A fact row that previews its record in a modal (an artist, a person of
 * the Réseau, a contract) instead of leaving the page. `name`: the modal's
 * title, the row's own words. */
export function RecordPeekRow({
  target,
  name,
  ...row
}: Omit<FactRowProps, "href" | "onClick"> & {
  target: PeekTarget;
  name: string;
}) {
  return (
    <FactRowDialog
      {...row}
      actionLabel={fr.peek.see}
      dialog={(open, onOpenChange) => (
        <RecordPeekDialog
          target={target}
          name={name}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
    />
  );
}
