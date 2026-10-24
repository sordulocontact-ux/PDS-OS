"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { usePublishResult } from "@/components/shell/module/result-banner";
import type { WriteResult } from "@/lib/utils/write-result";

/** One action of the Juridique (clearance, formality): pending state, its
 * refusal said in a toast, the page refreshed (an open drawer stays open on
 * the new data). A result that says what follows (`legalOutcome`, JUR-04)
 * shows in the step's banner and may open the viewer's next step; else
 * `done`, the transition said once it succeeded (« Dépôt enregistré : en
 * attente de la SACEM », JUR-28). */
export function useLegalAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();
  const run = (
    action: () => Promise<WriteResult>,
    onDone?: () => void,
    done?: string,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      if (result.done) publish(result);
      else if (done) toast.success(done);
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}
