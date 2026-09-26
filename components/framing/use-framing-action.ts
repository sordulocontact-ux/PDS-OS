"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";

/** Runs a framing server action; a failure shows its translated message. */
export function useFramingAction() {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else toast.error(fr.framing.errors[result.error]);
    });
  }

  return { pending, run };
}
