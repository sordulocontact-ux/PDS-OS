"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { FieldState as State } from "@/lib/legal/formalities/field-states";

const t = fr.legalDocuments.bulletin;
const TONE = {
  missing: "danger",
  proposed: "warning",
  confirmed: "success",
} as const;

/** Where a value of the bulletin stands, on its line (JUR-02): « Confirmé »,
 * « Proposé » with its source and « Confirmer », « Manquant » with why. An
 * optional value left empty says nothing. */
export function FieldStateLine({
  state,
  label,
  reason,
  onConfirm,
}: {
  state: Exclude<State, "optional"> | "confirmed";
  // A miss that no field answers names itself.
  label?: string;
  reason?: string;
  onConfirm?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusBadge tone={TONE[state]} size="sm">
        {t.states[state]}
      </StatusBadge>
      {label && <span className="font-medium break-words">{label}</span>}
      {reason && (
        <span className="text-caption text-muted-foreground">{reason}</span>
      )}
      {onConfirm && (
        <Button type="button" variant="outline" size="xs" onClick={onConfirm}>
          {t.confirm}
        </Button>
      )}
    </div>
  );
}
