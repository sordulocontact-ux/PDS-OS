"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import type { PublicAgreement as Agreement } from "@/lib/activations/influence/public";
import { answerAgreement } from "@/lib/activations/influence/public-actions";
import { fr } from "@/lib/i18n/fr";

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
  const { terms, rights } = agreement.content;

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

  const fee =
    terms.fee === null
      ? null
      : new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: terms.currency,
        }).format(terms.fee);
  const termRows: Array<[string, string | null]> = [
    [t.negotiation.fee, fee],
    [t.negotiation.deliverables, terms.deliverables],
    [t.negotiation.schedule, terms.schedule],
    [t.negotiation.organicUsage, terms.organic_usage],
    [t.negotiation.adsUsage, terms.ads_usage],
    [t.negotiation.exclusivity, terms.exclusivity],
    [t.negotiation.expenses, terms.expenses],
    [t.negotiation.conditions, terms.conditions],
  ];

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-background p-5 sm:p-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.public.terms}</h2>
        <dl className="flex flex-col gap-2 text-sm">
          {termRows
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
        </dl>
      </section>
      {rights.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t.public.rights}</h2>
          {rights.map((r) => (
            <div key={r.kind} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">{t.rights.kinds[r.kind]}</p>
              <p className="text-muted-foreground">
                {[
                  r.platforms.join(", "),
                  r.supports,
                  r.territory,
                  [r.starts_on, r.ends_on].filter(Boolean).join(" → "),
                  t.rights.remunerations[r.remuneration],
                  r.restrictions,
                ]
                  .filter(Boolean)
                  .join(" · ") || t.public.none}
              </p>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-muted-foreground">{t.public.notQualified}</p>
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
