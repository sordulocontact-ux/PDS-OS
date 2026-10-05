import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { SynthesisAction as Action } from "@/lib/legal/confirmation/synthesis";

/** « Répondre » / « Corriger »: back to the conversation, on that question
 * (« montrer les corrections possibles », Juridique 01). */
export function SynthesisAction({ action }: { action: Action }) {
  return (
    <Button
      variant="outline"
      size="xs"
      nativeButton={false}
      render={<Link href={action.href} />}
      // Above the row's stretched link.
      className="relative z-10"
    >
      {fr.legal.confirmation.actions[action.kind]}
    </Button>
  );
}
