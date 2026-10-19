"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { setDeliverableReceived } from "@/lib/master-workflow/final-actions";

/** « Noter comme reçu »: a deliverable received another way than the
 * engineer's link, noted by the owner. */
export function DeliverableReceived({
  projectId,
  masterId,
  deliverable,
}: {
  projectId: string;
  masterId: string;
  deliverable: string;
}) {
  const submit = useWriteSubmit(() => undefined, fr.masterFinal.received);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={submit.pending}
      onClick={() =>
        submit.run(() =>
          setDeliverableReceived(projectId, masterId, deliverable, true),
        )
      }
    >
      {fr.masterFinal.markReceived}
    </Button>
  );
}
