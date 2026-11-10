"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { AgreementTerms } from "@/components/activations/influence/agreement-terms";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import type { PublicAgreement as Agreement } from "@/lib/activations/influence/public";
import { answerAgreement } from "@/lib/activations/influence/public-actions";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";

const fr = { activationInfluence };

type Open = Extract<Agreement, { state: "open" }>;
const t = fr.activationInfluence;

/**
 * The exact version of the terms and rights, then « Bon pour accord » (name
 * and consent) or « Demander une modification ». Built for a phone : one
 * column, the main button full width. The answer carries the hash of what
 * was shown.
 */
export function PublicAgreement({
  token,
  agreement,
}: {
  token: string;
  agreement: Open;
}) {
  const [changing, setChanging] = useState(false);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "change_requested" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const send = (decision: "accept" | "change") =>
    startTransition(async () => {
      setError(null);
      const r = await answerAgreement({
        token,
        decision,
        name,
        comment,
        hash: agreement.hash,
        consent,
      });
      if (r.ok) setDone(r.state);
      else setError(r.error);
    });

  if (done)
    return (
      <p
        className="rounded-2xl border bg-background p-6 font-medium"
        role="status"
      >
        {t.public.done[done]}
      </p>
    );

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-background p-5 sm:p-6">
      <AgreementTerms content={agreement.content} />
      <p className="text-caption text-muted-foreground">
        {t.public.notQualified}
      </p>
      {changing ? (
        <div className="flex flex-col gap-3">
          <TextareaField
            name="comment"
            label={t.public.changeLabel}
            required
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={() => send("change")}
          >
            {t.public.send}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => setChanging(false)}
          >
            {t.public.back}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Field
            name="name"
            label={t.public.name}
            required
            autoComplete="name"
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <CheckboxField
            label={t.public.consent}
            checked={consent}
            onChange={setConsent}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={() => send("accept")}
          >
            {t.public.accept}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => setChanging(true)}
          >
            {t.public.change}
          </Button>
        </div>
      )}
    </div>
  );
}
