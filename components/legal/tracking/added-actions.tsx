"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legal } from "@/lib/i18n/fr/legal";
import { addLegalPlanItems } from "@/lib/legal/plan/actions";

const fr = { legal };

/** Actions the dossier asks for since the launch (a person or a title
 * added), with « Ajouter au plan »: each becomes an action and its task. */
export function AddedActions({
  projectId,
  count,
}: {
  projectId: string;
  count: number;
}) {
  const t = fr.legal.tracking.added;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ToneCallout
      tone="action"
      contentClassName="flex flex-wrap items-center justify-between gap-3"
    >
      <span>{t.body(count)}</span>
      <Button
        size="sm"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            const result = await addLegalPlanItems(projectId);
            if (!result.ok) return void toast.error(result.error);
            router.refresh();
          })
        }
      >
        {pending ? t.adding : t.action}
      </Button>
    </ToneCallout>
  );
}
