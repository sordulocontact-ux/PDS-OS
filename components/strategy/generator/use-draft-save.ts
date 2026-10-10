"use client";

import { useRouter } from "next/navigation";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { saveDocumentDraft } from "@/lib/strategy/actions/documents";

/**
 * Saves a generator step's choices, then opens the next step. A refusal
 * shows its message and keeps the person on the step with what they typed.
 */
export function useDraftSave(
  projectId: string,
  kind: "release_plan" | "press_kit",
) {
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const save = (patch: Record<string, unknown>, nextHref?: string) =>
    run(
      () => saveDocumentDraft(projectId, kind, patch),
      () => {
        if (nextHref) router.push(nextHref);
      },
    );
  return { pending, save };
}
