"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  generateStrategyBrief,
  openStrategyRevision,
} from "@/lib/strategy/actions/workflow";

/**
 * « Générer » / « Mettre à jour le Brief de sortie »: a new version written
 * by the server from the eight dimensions (never sent by the browser).
 */
export function GenerateBriefButton({
  projectId,
  update,
  disabled,
  variant = "default",
}: {
  projectId: string;
  // A version exists: the label says it is replaced, not rewritten.
  update: boolean;
  disabled?: boolean;
  variant?: "default" | "outline";
}) {
  const t = fr.strategyDocs.brief;
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="lg"
      variant={variant}
      disabled={disabled || pending}
      onClick={() => run(() => generateStrategyBrief(projectId))}
    >
      {pending ? t.generating : update ? t.update : t.generate}
    </Button>
  );
}

/** « Réviser la stratégie »: V1 stays, the next version follows it. */
export function ReviseStrategyButton({ projectId }: { projectId: string }) {
  const t = fr.strategyDocs.brief;
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="lg"
      variant="outline"
      disabled={pending}
      onClick={() => run(() => openStrategyRevision(projectId))}
    >
      {pending ? t.revising : t.revise}
    </Button>
  );
}
