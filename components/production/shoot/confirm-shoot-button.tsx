"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionShootExternal } from "@/lib/i18n/fr/production-shoot-external";
import { saveShootState } from "@/lib/production/shoot/shoot-actions";

const fr = { productionShootExternal };

const t = fr.productionShootExternal;

/** « Confirmer que le tournage a eu lieu » (external, proto BODY.shoot). */
export function ConfirmShootButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, t.done);
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(() =>
              saveShootState({
                projectId,
                sheetId,
                state: "done",
                observations: "",
                missingSequences: "",
                deviations: "",
              }),
            )
          }
        >
          {t.confirm}
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
