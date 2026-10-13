"use client";

import { HandoffPlanForm } from "@/components/design/closure/handoff-plan-form";
import { ReopenDesignForm } from "@/components/design/closure/reopen-design-form";
import { DialogButton } from "@/components/ui/dialog-button";
import type { HandoffItem } from "@/lib/design/handoff-plan";
import { fr } from "@/lib/i18n/fr";

/** « Passer en Production » (owner) and « Rouvrir » (direction). */
export function ClosureActions({
  projectId,
  items,
  canPass,
  canReopen,
}: {
  projectId: string;
  items: HandoffItem[];
  canPass: boolean;
  canReopen: boolean;
}) {
  const t = fr.conceptionClosure;
  const handed = items.filter((i) => i.state === "handed");
  return (
    <>
      {canPass && (
        <DialogButton
          label={handed.length ? t.update : t.pass}
          variant={handed.length ? "outline" : "default"}
          size="lg"
          title={t.planTitle}
          description={t.planIntro}
          wide
        >
          {(close) => (
            <HandoffPlanForm
              projectId={projectId}
              items={items}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {canReopen && (
        <DialogButton
          label={t.reopen}
          variant="ghost"
          size="lg"
          title={t.reopenTitle}
          description={t.reopenIntro}
        >
          {(close) => (
            <ReopenDesignForm
              projectId={projectId}
              handed={handed}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </>
  );
}
