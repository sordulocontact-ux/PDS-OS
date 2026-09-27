"use client";

import { useActionState, useEffect } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  idleMasterFormState,
  type MasterFormState,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

type Action = (
  previous: MasterFormState,
  formData: FormData,
) => Promise<MasterFormState>;

// A form of the master page in its modal: hidden ids, the fields, the error,
// then Annuler / Enregistrer. Closes itself once saved; after a refused save
// the typed values come back (`value`) with each field's error (`error`).
export function MasterForm({
  action,
  hidden,
  onDone,
  children,
}: {
  action: Action;
  // Ids the action needs (master, edited row…).
  hidden: Record<string, string | null | undefined>;
  onDone: () => void;
  children: (field: {
    value: (name: string, saved: string | number | null | undefined) => string;
    error: (name: string) => string | undefined;
  }) => React.ReactNode;
}) {
  const t = fr.masterPage.form;
  const [state, formAction] = useActionState(action, idleMasterFormState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status === "saved") onDone();
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {Object.entries(hidden).map(([name, value]) =>
        value ? (
          <input key={name} type="hidden" name={name} value={value} />
        ) : null,
      )}
      {children({
        value: (name, saved) => values[name] ?? (saved ?? "").toString(),
        error: (name) => errors[name],
      })}
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
