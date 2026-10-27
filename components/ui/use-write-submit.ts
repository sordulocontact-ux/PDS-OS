"use client";

import { useState, useTransition } from "react";

import { usePublishResult } from "@/components/shell/module/result-banner";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * Runs a write from a dialog or a button: pending while it
 * runs, the error kept next to the form, then a toast (the result's notice
 * when there is one, else its `done`, else the message) and `onDone`. Inside
 * an open step, a result that says what follows also shows in the step's
 * ResultBanner (VISION-UX rule 7). `onDone` is `undefined` when nothing
 * follows: a Server Action that revalidates already re-renders the page in
 * its own response, so a `router.refresh()` here would render it twice.
 */
export function useWriteSubmit(
  onDone: (() => void) | undefined,
  doneMessage: string,
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const publish = usePublishResult();

  // `message`: this run's own success message (which submit was chosen).
  function run(task: () => Promise<WriteResult>, message?: string) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      publish(result, message ?? doneMessage);
      onDone?.();
    });
  }

  return { pending, error, setError, run };
}
