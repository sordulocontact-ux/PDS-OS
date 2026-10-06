"use client";

import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { openFormality } from "@/lib/legal/formalities/actions";

/** « Ouvrir la formalité » of a title: its dossier starts from what PDS OS
 * already knows. */
export function OpenFormalityButton({
  projectId,
  masterId,
}: {
  projectId: string;
  masterId: string;
}) {
  const { pending, run } = useLegalAction();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => run(() => openFormality(projectId, masterId))}
    >
      {fr.legalFormalities.page.open}
    </Button>
  );
}
