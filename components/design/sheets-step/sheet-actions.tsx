"use client";

import { FieldError } from "@/components/auth/form-message";
import { useDesignStyle } from "@/components/shell/use-design-style";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  openSheetVersion,
  submitSheetStep,
  transferSheet,
} from "@/lib/design/actions/sheet-step";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.sheets;

/**
 * The gestures under a sheet (proto ficheCard): « Soumettre à … » with
 * « Il manque : … » beside it, « Transférer en Production » for the owner
 * once validated, « Modifier (nouvelle version) » for its responsible.
 */
export function SheetActions({
  projectId,
  sheetId,
  title,
  submit,
  missing,
  transfer,
  newVersion,
}: {
  projectId: string;
  sheetId: string;
  title: string;
  // « Soumettre à Claire Morel » / « Corriger et soumettre à nouveau ».
  submit: string | null;
  missing: string[];
  transfer: boolean;
  // The next version's number, when the responsible may open it.
  newVersion: number | null;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, "");
  const modern = useDesignStyle() === "modern";
  if (!submit && !transfer && newVersion === null) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5 modern:gap-2">
        {submit && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => submitSheetStep({ projectId, sheetId }))}
          >
            {submit}
          </Button>
        )}
        {submit && missing.length > 0 && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {t.missing(missing.join(", "))}
          </span>
        )}
        {transfer && (
          <Button
            size="sm"
            // One black action per screen in the new style.
            variant={modern && submit ? "outline" : "default"}
            disabled={pending}
            onClick={() =>
              run(() => transferSheet({ projectId, sheetId, title }))
            }
          >
            {t.transfer}
          </Button>
        )}
        {newVersion !== null && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(
                () => openSheetVersion({ projectId, sheetId }),
                t.newVersionDone(newVersion),
              )
            }
          >
            {t.newVersion}
          </Button>
        )}
      </div>
      <FieldError id={`sheet-${sheetId}-actions-error`}>
        {error ?? undefined}
      </FieldError>
    </div>
  );
}
