"use client";

import { usePlanSheet } from "@/components/legal/tracking/plan-sheet-context";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/** « Suivant : … » at the foot of a panel: the next line that waits for the
 * team opens in its place (UX test of 09/10/2026: ~15 round trips). */
export function NextLineButton({ id }: { id: string }) {
  const sheet = usePlanSheet();
  const next = sheet.nextOf(id);
  if (!next) return null;
  return (
    <Button size="sm" onClick={() => sheet.open(next.id)}>
      {fr.legal.board.next(next.label)}
    </Button>
  );
}
