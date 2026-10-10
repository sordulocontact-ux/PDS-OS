"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { idleFormState } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";
import { startStrategy } from "@/lib/strategy/actions/start";

/** « Commencer la stratégie »: opens the work; says why when it cannot. */
export function StartStrategyForm({ projectId }: { projectId: string }) {
  const t = fr.strategyEntry;
  const [state, action] = useActionState(
    startStrategy.bind(null, projectId),
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
