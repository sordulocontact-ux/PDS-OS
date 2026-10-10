"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { PostResult } from "@/lib/production/post/result";

/**
 * Runs a postproduction write from a dialog or a button: pending while it
 * runs, the error kept next to the form, then a toast (the result's notice
 * when there is one) and `onDone`.
 */
export function usePostSubmit(onDone: () => void, doneMessage: string) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // `message`: this run's own success message (which submit was chosen).
  function run(task: () => Promise<PostResult>, message?: string) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      if (result.notice) toast.warning(result.notice);
      else toast.success(message ?? doneMessage);
      onDone();
    });
  }

  return { pending, error, setError, run };
}
