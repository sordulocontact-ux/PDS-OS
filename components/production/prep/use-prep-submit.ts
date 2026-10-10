"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { PrepResult } from "@/lib/production/prep-result";

/**
 * Runs a preparation write from a dialog: pending while it runs, the error
 * kept next to the form when it fails, a toast and `onDone` when it
 * succeeds.
 */
export function usePrepSubmit(onDone: () => void, doneMessage: string) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<PrepResult>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        toast.success(doneMessage);
        onDone();
      } else setError(result.error);
    });
  }

  return { pending, error, run };
}
