"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideProof, provideProof } from "@/lib/activations/trunk-actions";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";

const fr = { activationJourney };

const t = fr.activationJourney.gesture;
const e = fr.activationJourney.errors;

type Ids = { projectId: string; activationId: string };

/** « Fournir la preuve » (proto): its link, or « Preuve indisponible » with
 * why. Each missing field in red after the first try. */
export function ProofForm({ ids }: { ids: Ids }) {
  const [unavailable, setUnavailable] = useState(false);
  const [missing, setMissing] = useState<"url" | "why" | null>(null);
  const { pending, error, run } = useWriteSubmit(undefined, "");
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const url = String(data.get("url") ?? "").trim();
        const why = String(data.get("why") ?? "").trim();
        const gap = unavailable ? (why ? null : "why") : url ? null : "url";
        setMissing(gap);
        if (!gap)
          run(() =>
            provideProof({
              ...ids,
              url: unavailable ? "" : url,
              unavailable,
              why,
            }),
          );
      }}
    >
      <Field
        name="url"
        type="url"
        inputMode="url"
        label={t.proofLink}
        placeholder="https://…"
        required={!unavailable}
        error={missing === "url" ? e.proofLink : undefined}
      />
      <CheckboxField
        label={t.proofUnavailable}
        checked={unavailable}
        onChange={setUnavailable}
      />
      <Field
        name="why"
        label={t.proofWhy}
        required={unavailable}
        error={missing === "why" ? e.proofWhy : undefined}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {t.saveProof}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}

/** « Vérifier la preuve » / « Contester » (a comment is required to
 * contest), by the direction. */
export function VerifyProofForm({
  projectId,
  evidenceId,
  url,
  provided,
}: {
  projectId: string;
  evidenceId: string;
  url: string | null;
  // « fournie par Lina Haddad le 14/10 »
  provided: string;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(undefined, "");
  const decide = (verdict: "verified" | "contested", form: HTMLFormElement) => {
    const note = String(new FormData(form).get("note") ?? "").trim();
    const gap = verdict === "contested" && !note;
    setMissing(gap);
    if (!gap) run(() => decideProof({ projectId, evidenceId, verdict, note }));
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        decide("verified", event.currentTarget);
      }}
    >
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.proofLabel}{" "}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-foreground underline underline-offset-4"
          >
            {url}
          </a>
        ) : null}{" "}
        · {provided}
      </p>
      <TextareaField
        name="note"
        label={t.comment}
        hint={t.commentHint}
        rows={2}
        maxLength={2000}
        error={missing ? e.commentToContest : undefined}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {t.verify}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) decide("contested", form);
          }}
        >
          {t.contest}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
