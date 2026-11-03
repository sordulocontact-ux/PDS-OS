"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import type { ActionResult } from "@/lib/framing/result";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

/**
 * Runs a framing server action; a failure shows its translated message, in a
 * toast, or (`inline`) in `error` for the modal that asked for it to show
 * next to its button: a toast under a modal goes unseen (UX test of
 * 09/10/2026, « Envoyer en validation » that "did nothing").
 */
export function useFramingAction(defaults?: { inline?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<ActionResult>,
    onSuccess?: () => void,
    options?: { inline?: boolean },
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) return onSuccess?.();
      const message = fr.framing.errors[result.error];
      if (options?.inline ?? defaults?.inline) setError(message);
      else toast.error(message);
    });
  }

  return { pending, run, error, clearError: () => setError(null) };
}
