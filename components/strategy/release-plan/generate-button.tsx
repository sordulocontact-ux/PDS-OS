"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { generatePressKit } from "@/lib/strategy/actions/press-kit";
import { generateReleasePlan } from "@/lib/strategy/actions/release-plan";
import type { GeneratorKind } from "@/lib/strategy/documents/generator-kind";

const fr = { strategyReleasePlan, strategyPressKit };

/**
 * « Générer le Plan de sortie »: the server builds the next version from the
 * validated strategy and the draft, then the preview opens on it.
 */
export function GenerateButton({
  projectId,
  again,
  previewHref,
  kind = "release_plan",
}: {
  projectId: string;
  kind?: GeneratorKind;
  // A version exists: the next one replaces it (the old ones stay listed).
  again: boolean;
  previewHref: string;
}) {
  const t =
    kind === "press_kit"
      ? fr.strategyPressKit.generate
      : fr.strategyReleasePlan.generate;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="lg"
      variant={again ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        run(
          () =>
            kind === "press_kit"
              ? generatePressKit(projectId)
              : generateReleasePlan(projectId),
          () => {
            toast.success(t.done);
            router.push(previewHref);
          },
        )
      }
    >
      {pending ? t.generating : again ? t.again : t.button}
    </Button>
  );
}
