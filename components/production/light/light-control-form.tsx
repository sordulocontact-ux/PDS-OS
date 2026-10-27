"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { confirmLightCheck } from "@/lib/production/light/actions";

const fr = { productionLight };

const t = fr.productionLight.control;

/** « À contrôler » then « Confirmer : fichiers conformes » (proto
 * lightBody): each point checked by a person before the confirmation. */
export function LightControlForm({
  projectId,
  sheetId,
  points,
}: {
  projectId: string;
  sheetId: string;
  points: string[];
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => undefined, t.confirmed);
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const all = checked.size === points.length;
        setMissing(!all);
        if (all) run(() => confirmLightCheck({ projectId, sheetId }));
      }}
    >
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 font-semibold">{t.manual}</legend>
        {points.map((p, i) => (
          <CheckboxField
            key={p}
            label={p}
            checked={checked.has(i)}
            onChange={(on) =>
              setChecked((c) => {
                const next = new Set(c);
                if (on) next.add(i);
                else next.delete(i);
                if (next.size === points.length) setMissing(false);
                return next;
              })
            }
          />
        ))}
      </fieldset>
      {missing && <FieldError id="light-check-error">{t.unchecked}</FieldError>}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.confirm}
        </Button>
      </div>
    </form>
  );
}
