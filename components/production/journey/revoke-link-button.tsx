"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionProducer } from "@/lib/i18n/fr/production-producer";
import { revokeProviderLink } from "@/lib/production/role-actions";

const fr = { productionProducer };

const t = fr.productionProducer.revoke;

/** « Révoquer » of « Liens privés »: the link stops working at once, what
 * the person deposited stays. */
export function RevokeLinkButton({
  projectId,
  sheetId,
  contactId,
  name,
}: {
  projectId: string;
  sheetId: string;
  contactId: string;
  name: string;
}) {
  const { pending, run } = useWriteSubmit(() => undefined, t.done);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={t.label(name)}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        run(() => revokeProviderLink({ projectId, sheetId, contactId }))
      }
    >
      {t.button}
    </Button>
  );
}
