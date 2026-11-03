"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

type Result = { ok: true } | { ok: false; error: string };

/** A write from the provider's page: pending, the error kept next to the
 * form, a toast. Every action it runs revalidates the provider's page,
 * which re-renders it in the action's own response. */
export function useLinkSubmit() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(
    task: () => Promise<Result>,
    message: string,
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      toast.success(message);
      after?.();
    });
  }
  return { pending, error, run };
}
