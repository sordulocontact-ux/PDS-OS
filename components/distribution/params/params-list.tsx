"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ParamField } from "@/components/distribution/params/param-field";
import { UpcField } from "@/components/distribution/params/upc-field";
import { Button } from "@/components/ui/button";
import { FactRows } from "@/components/ui/fact-row";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { confirmDistributionParams } from "@/lib/distribution/params-actions";
import {
  missingParams,
  PARAM_KEYS,
  type ParamKey,
  type ParamsData,
} from "@/lib/distribution/params-view";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.params;

/**
 * The step « Paramètres de distribution » (proto `UI.params`): every
 * parameter with its source and « Modifier » on place, then « Confirmer les
 * paramètres » in one gesture. What is still missing turns red with its
 * reason only after a first try (CLAUDE.md, « Manques à la validation »);
 * the button is never disabled for it. `confirm`: false once confirmed (the
 * rows stay editable until the submission).
 */
export function ParamsList({
  data,
  confirm,
}: {
  data: ParamsData;
  confirm: boolean;
}) {
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setTried(false),
    t.confirmed,
  );
  const missing = missingParams(data);
  const shown: ParamKey[] = tried ? missing : [];
  const reason = (key: ParamKey) =>
    shown.includes(key) && key in t.required
      ? t.required[key as keyof typeof t.required]
      : null;

  const submit = () => {
    setTried(true);
    if (missing.length > 0) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(`[data-param="${missing[0]}"]`)
          ?.focus(),
      );
      return;
    }
    run(() => confirmDistributionParams({ projectId: data.projectId }));
  };

  return (
    <div className="flex flex-col gap-3.5">
      <FactRows>
        {PARAM_KEYS.map((key) => (
          <ParamField key={key} data={data} field={key} missing={reason(key)} />
        ))}
        <UpcField data={data} />
      </FactRows>
      {confirm && data.canEdit && (
        <>
          {shown.length > 0 && (
            <FormMessage kind="error">{t.missing(shown.length)}</FormMessage>
          )}
          <FormMessage kind="error">{error}</FormMessage>
          <div>
            <Button
              type="button"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={submit}
            >
              {t.confirm}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
