"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Result = { ok: true } | { ok: false; error: string };

/** A write from the provider's page: pending, the error kept next to the
 * form, a toast, then the page read again (no session to revalidate). */
export function useLinkSubmit() {
  const router = useRouter();
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
      router.refresh();
    });
  }
  return { pending, error, run };
}
