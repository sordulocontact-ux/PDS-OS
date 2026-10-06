"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type Result = { ok: true } | { ok: false; error: string };

/** One action of the Juridique (clearance, formality): pending state, its
 * refusal said in a toast, the page refreshed (an open drawer stays open on
 * the new data). */
export function useLegalAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}
