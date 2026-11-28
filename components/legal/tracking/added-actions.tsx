"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import { addLegalPlanItems } from "@/lib/legal/plan/actions";

const fr = { legal };

/** Actions the dossier asks for since the launch (a person or a title
 * added), with « Ajouter au plan »: each becomes an action and its task;
 * then the Juridique opens where the viewer acts (its entry), the result
 * said (docs/VISION-UX.md § 5, règle 7). */
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
            toast.success(t.done);
            router.push(routes.projectLegal(projectId));
          })
        }
      >
        {pending ? t.adding : t.action}
      </Button>
    </ToneCallout>
  );
}
