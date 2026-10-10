"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { DesignResult } from "@/lib/design/actions/shared";

/**
 * Runs a Conception server action: a refusal shows its sentence in a toast,
 * a success its own message if any. The action revalidates the page.
 */
export function useDesignAction() {
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<DesignResult>,
    { success, onSuccess }: { success?: string; onSuccess?: () => void } = {},
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (success) toast.success(success);
      onSuccess?.();
    });
  }

  return { pending, run };
}
