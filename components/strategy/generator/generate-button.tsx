"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { generateExternalDocument } from "@/lib/strategy/actions/documents";

/**
 * « Générer »: the server writes the version from the validated Brief and
 * the saved choices, publishes the allowed visuals, then opens the preview.
 */
export function GenerateButton({
  projectId,
  kind,
  label,
  pendingLabel,
  variant = "default",
}: {
  projectId: string;
  kind: "release_plan" | "press_kit";
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="lg"
      variant={variant}
      disabled={pending}
      onClick={() => run(() => generateExternalDocument(projectId, kind))}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
