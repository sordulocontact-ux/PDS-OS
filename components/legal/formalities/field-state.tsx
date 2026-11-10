"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { FieldState as State } from "@/lib/legal/formalities/field-states";

const fr = { legalDocuments };

const t = fr.legalDocuments.bulletin;
const TONE = {
  missing: "warning",
  proposed: "info",
  confirmed: "success",
} as const;

/** One value of the bulletin as a fact row (JUR-02, proto `vfact`): its
 * label, the field (or the words) as value, where it comes from under it
 * (« Proposé » with its source, « Manquant » with why), and its state on the
 * right: « Confirmé », « Proposé » with « Confirmer », « Manquant ». An
 * optional value left empty passes no `state` and says nothing. The bulletin
 * saves as a whole: the field is never saved on its own. */
export function BulletinRow({
  label,
  required,
  control,
  value,
  state,
  reason,
  invalid,
  onConfirm,
  side,
  below,
}: {
  label?: string;
  required?: boolean;
  control?: ReactNode;
  value?: ReactNode;
  state?: Exclude<State, "optional"> | "confirmed" | null;
  reason?: string;
  // Still to confirm once « Générer » was tried: the pill in red, the field
  // saying why under it (Sacha, 10/11/2026).
  invalid?: boolean;
  onConfirm?: () => void;
  // Another action of the row (« Ouvrir l'autorisation »…).
  side?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <FactRowFrame
      label={label}
      required={required}
      control={control}
      value={value}
      source={reason}
      state={
        state
          ? {
              tone: invalid ? "danger" : TONE[state],
              label: t.states[state],
            }
          : null
      }
      side={
        onConfirm || side ? (
          <>
            {onConfirm && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                // Where « Générer » leads when only confirmations are left.
                data-to-confirm
                onClick={onConfirm}
              >
                {t.confirm}
              </Button>
            )}
            {side}
          </>
        ) : undefined
      }
      below={below}
    />
  );
}
