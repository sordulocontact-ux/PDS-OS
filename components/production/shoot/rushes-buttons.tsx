"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionShootExternal } from "@/lib/i18n/fr/production-shoot-external";
import { declareRushes } from "@/lib/production/shoot/shoot-actions";

const fr = { productionShootExternal };

const t = fr.productionShootExternal;

/** « Rushes reçus » then « Sauvegarde vérifiée » (proto BODY.rushes): the
 * next declaration of whoever runs the production, with what it means. */
export function RushesButtons({
  projectId,
  sheetId,
  step,
}: {
  projectId: string;
  sheetId: string;
  step: "received" | "backup";
}) {
  const { pending, error, run } = useWriteSubmit(
    () => undefined,
    step === "received" ? t.receivedDone : t.backupDone,
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => run(() => declareRushes({ projectId, sheetId, step }))}
        >
          {step === "received" ? t.received : t.backup}
        </Button>
        <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {step === "received" ? t.receivedHint : t.backupHint}
        </span>
      </div>
      {error && <p className="text-[color:var(--tone-danger-fg)]">{error}</p>}
    </div>
  );
}
