"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { usePublishResult } from "@/components/shell/module/result-banner";
import type { WriteDone } from "@/lib/utils/write-result";

/**
 * After an answer to PO's question in « Les 8 dimensions » (as the
 * Cadrage's useNextQuestion): the banner says what was recorded, without a
 * toast — there are many answers —, above the next question the server
 * chooses (`afterHref`). A result that opens the viewer's next step
 * (withOutcome: the last arbitration) goes there instead.
 */
export function useAfterAnswer(afterHref: string) {
  const router = useRouter();
  const publish = usePublishResult();
  return useCallback(
    (result: WriteDone) => {
      publish(result, undefined, { toast: false });
      if (!result.open) router.push(afterHref);
    },
    [afterHref, publish, router],
  );
}
