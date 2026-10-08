"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { fr } from "@/lib/i18n/fr";
import type { BriefDeliverable } from "@/lib/master-workflow/brief-types";
import { setDeliverableReceived } from "@/lib/master-workflow/final-actions";
import { Checkbox } from "@/components/ui/checkbox";

/** The brief's other deliverables of a title, checked off by the owner as
 * they arrive; read-only for everyone else. */
export function DeliverablesChecklist({
  projectId,
  masterId,
  deliverables,
  canEdit,
}: {
  projectId: string;
  masterId: string;
  deliverables: Array<{ key: BriefDeliverable; received: boolean }>;
  canEdit: boolean;
}) {
  const t = fr.masterWorkflow.final;
  const labels = fr.masterWorkflow.brief.deliverables;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (deliverables.length === 0)
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        {t.noDeliverables}
      </p>
    );
  return (
    <fieldset disabled={!canEdit || pending} className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{t.deliverables}</legend>
      {deliverables.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm">
          <Checkbox
            defaultChecked={item.received}
            onChange={(event) => {
              const received = event.target.checked;
              startTransition(async () => {
                const result = await setDeliverableReceived(
                  projectId,
                  masterId,
                  item.key,
                  received,
                );
                if (!result.ok) toast.error(result.error);
                router.refresh();
              });
            }}
          />
          {labels[item.key]}
        </label>
      ))}
      {canEdit && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.deliverablesHint}
        </p>
      )}
    </fieldset>
  );
}
