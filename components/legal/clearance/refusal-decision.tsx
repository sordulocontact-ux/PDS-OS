"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import {
  replaceClearance,
  withdrawClearance,
} from "@/lib/legal/clearance/actions";

const fr = { legalClearance };

const t = fr.legalClearance.stages.negotiate.decide;

/** One way out of a refusal, with its required text. */
function Choice({
  id,
  title,
  body,
  label,
  action,
  done,
  submit,
}: {
  id: string;
  title: string;
  body: string;
  label: string;
  action: string;
  done: string;
  submit: (
    text: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(undefined, done);
  const missing = !text.trim();
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] bg-card p-3.5 modern:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (missing) return document.getElementById(id)?.focus();
        run(() => submit(text.trim()));
      }}
    >
      <h4 className="font-semibold">{title}</h4>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {body}
      </p>
      <TextareaField
        id={id}
        name={id}
        label={label}
        required
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(event) => setText(event.target.value)}
        error={tried && missing ? fr.legalClearance.errors.note : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button
        type="submit"
        className="self-start"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {action}
      </Button>
    </form>
  );
}

/**
 * « Décider de la suite » after the rightsholders refused (proto « Projet
 * complet », scénario « refusal »): withdraw the element from the title,
 * with why (the Master is told), or replace it and ask again.
 */
export function RefusalDecision({
  projectId,
  clearanceId,
}: {
  projectId: string;
  clearanceId: string;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={t.title}>
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.title}
      </h3>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.blocked}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Choice
          id={`withdraw-${clearanceId}`}
          title={t.withdraw}
          body={t.withdrawBody}
          label={t.withdrawWhy}
          action={t.withdraw}
          done={t.withdrawDone}
          submit={(text) => withdrawClearance({ projectId, clearanceId, text })}
        />
        <Choice
          id={`replace-${clearanceId}`}
          title={t.replace}
          body={t.replaceBody}
          label={t.replaceWhat}
          action={t.replaceAction}
          done={t.replaceDone}
          submit={(text) => replaceClearance({ projectId, clearanceId, text })}
        />
      </div>
    </section>
  );
}
