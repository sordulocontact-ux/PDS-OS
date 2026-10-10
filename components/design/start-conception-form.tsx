"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { idleFormState } from "@/lib/auth/form-state";
import { startConception } from "@/lib/design/actions/start";
import { fr } from "@/lib/i18n/fr";

/** « Commencer directement »: opens the direct work; says why when it cannot. */
export function StartConceptionForm({ projectId }: { projectId: string }) {
  const t = fr.conception.entry;
  const [state, action] = useActionState(
    startConception.bind(null, projectId),
    idleFormState,
  );
  return (
    <form action={action} className="contents">
      <SubmitButton pendingLabel={t.starting}>{t.start}</SubmitButton>
      {state.status === "error" && state.formError && (
        <div className="basis-full">
          <FormMessage kind="error">{state.formError}</FormMessage>
        </div>
      )}
    </form>
  );
}
