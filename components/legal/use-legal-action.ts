"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { usePublishResult } from "@/components/shell/module/result-banner";
import type { WriteResult } from "@/lib/utils/write-result";

/** One action of the Juridique (clearance, formality): pending state, its
 * refusal said in a toast, the page re-rendered by the action's revalidation
 * (an open drawer stays open on the new data). A result that says what follows (`legalOutcome`, JUR-04)
 * shows in the step's banner and may open the viewer's next step; else
 * `done`, the transition said once it succeeded (« Dépôt enregistré : en
 * attente de la SACEM », JUR-28).
 *
 * The actions revalidate the project's pages, which re-renders the page in
 * their own response: no `router.refresh()` after them. `refresh: true` only
 * for a caller that runs an action with a success path that revalidates
 * nothing (a clearance already at the target state). */
export function useLegalAction({
  refresh = false,
}: { refresh?: boolean } = {}) {
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
      if (refresh) router.refresh();
    });
  return { pending, run };
}
