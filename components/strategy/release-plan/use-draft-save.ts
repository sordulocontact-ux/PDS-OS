"use client";

import { useRouter } from "next/navigation";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { savePressKitDraft } from "@/lib/strategy/actions/press-kit";
import { saveReleasePlanDraft } from "@/lib/strategy/actions/release-plan";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";
import type { PressKitConfig } from "@/lib/strategy/documents/press-kit-model";
import type { ReleasePlanConfig } from "@/lib/strategy/documents/release-plan-model";

/**
 * Saves a step's choices into the draft of the document being generated
 * (Plan de sortie or Dossier de presse), then opens the next step. A
 * refusal shows its message and keeps the person on the step with what
 * they typed.
 */
export function useDraftSave(
  projectId: string,
  kind: GeneratorKind = "release_plan",
) {
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const save = (patch: ReleasePlanConfig | PressKitConfig, nextHref?: string) =>
    run(
      () =>
        kind === "press_kit"
          ? savePressKitDraft(projectId, patch)
          : saveReleasePlanDraft(projectId, patch),
      () => {
        if (nextHref) router.push(nextHref);
      },
    );
  return { pending, save };
}
