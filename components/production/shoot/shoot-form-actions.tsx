"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";

const fr = { productionShoot };

const t = fr.productionShoot;

/** The error, then « Annuler » and the main button, at the bottom of a shoot
 * dialog. */
export function ShootFormActions({
  pending,
  error,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.saving : submitLabel}
        </Button>
      </div>
    </>
  );
}
