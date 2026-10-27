"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { reviseContractClause } from "@/lib/legal/contracts/clause-actions";
import { CLAUSES, type Clause } from "@/lib/legal/contracts/clauses";

const t = fr.legalDocuments.contract;

/**
 * « Modifier une clause · Crée une nouvelle version du document » (proto
 * « Projet complet », the person's step): which clause, its new wording in
 * the document's text, and why. A value is never changed here: it is
 * corrected at its source and the contract follows.
 */
export function ClauseForm({
  projectId,
  contractId,
  body,
}: {
  projectId: string;
  contractId: string;
  body: string;
}) {
  const [clause, setClause] = useState<Clause>("credit");
  const [text, setText] = useState(body);
  const [why, setWhy] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setWhy("");
    setTried(false);
  }, t.created);
  const sameText = text.trim() === body.trim();

  return (
    <Fold
      summary={
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span>{t.revise}</span>
          <span className="font-medium">{t.reviseHint}</span>
        </span>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (sameText)
            return document
              .getElementById(`clause-text-${contractId}`)
              ?.focus();
          if (!why.trim())
            return document.getElementById(`clause-why-${contractId}`)?.focus();
          run(() =>
            reviseContractClause({
              projectId,
              contractId,
              clause,
              body: text,
              reason: why,
            }),
          );
        }}
      >
        <OptionSelect
          id={`clause-${contractId}`}
          name="clause"
          label={t.clause}
          items={Object.fromEntries(CLAUSES.map((c) => [c, t.clauses[c]]))}
          defaultValue={clause}
          onValueChange={(value) => setClause(value as Clause)}
        />
        <TextareaField
          id={`clause-text-${contractId}`}
          name="body"
          label={t.newText}
          required
          hint={t.newTextHint}
          rows={10}
          maxLength={200_000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          error={tried && sameText ? t.missingText : undefined}
        />
        <TextareaField
          id={`clause-why-${contractId}`}
          name="reason"
          label={t.why}
          required
          rows={2}
          maxLength={2000}
          placeholder={t.whyPlaceholder}
          value={why}
          onChange={(event) => setWhy(event.target.value)}
          error={tried && !why.trim() ? t.missingWhy : undefined}
        />
        <FormMessage kind="error">{error}</FormMessage>
        <div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {t.create}
          </Button>
        </div>
      </form>
    </Fold>
  );
}
