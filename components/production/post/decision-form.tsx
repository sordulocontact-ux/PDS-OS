"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { holderValue } from "@/components/production/holder-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionCorrections } from "@/lib/i18n/fr/production-corrections";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { requestCorrections } from "@/lib/production/post/correction-actions";
import { timecodeLabel } from "@/lib/production/post/labels";
import { decidePostVersion } from "@/lib/production/post/review-actions";
import {
  isPendingCorrection,
  VERSION_DECISIONS,
  type VersionDecision,
} from "@/lib/production/post/rules";
import type { PostPeople, PostVersion } from "@/lib/production/post/types";
import type { Holder } from "@/lib/production/sheet";

import { CorrectionFields, type CorrectionMissing } from "./correction-fields";

const fr = { productionPost, productionCorrections };

const t = fr.productionPost.decision;
const tc = fr.productionCorrections;

type Missing = CorrectionMissing | "choice" | "note";

/**
 * The one decision on a version under review (PROD-033), each choice with
 * its consequence: « Valider » (the creative validation, the delivery
 * opens), « Demander des corrections » — the open feedback kept (all by
 * default, a duplicate unticked), who must act and by when, prefilled from
 * the editing step (PROD-031) —, or « Refuser » with a reason.
 */
export function DecisionForm({
  projectId,
  version,
  people,
  defaults,
}: {
  projectId: string;
  version: PostVersion;
  people: PostPeople;
  defaults: { recipient: Holder | null; dueOn: string | null };
}) {
  const pending = version.comments.filter((c) => isPendingCorrection(c.status));
  const [decision, setDecision] = useState<VersionDecision | null>(null);
  const [kept, setKept] = useState(new Set(pending.map((c) => c.id)));
  const [recipient, setRecipient] = useState(holderValue(defaults.recipient));
  const [missing, setMissing] = useState(new Set<Missing>());
  const write = useWriteSubmit(
    () => {
      setDecision(null);
      setMissing(new Set());
    },
    decision === "changes" ? tc.done : t.done,
  );
  const id = `decision-${version.id}`;

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const note = String(data.get("note") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const dueOn = String(data.get("dueOn") ?? "");
    const lack = new Set<Missing>();
    if (!decision) lack.add("choice");
    if (decision === "refuse" && !note) lack.add("note");
    if (decision === "changes") {
      if (!recipient) lack.add("recipient");
      if (!dueOn) lack.add("due");
      if (kept.size === 0 && !message) lack.add("content");
    }
    setMissing(lack);
    if (!decision || lack.size > 0) {
      form
        .querySelector<HTMLElement>(
          lack.has("choice") ? "input[type=radio]" : "[aria-invalid=true]",
        )
        ?.focus();
      return;
    }
    if (decision === "changes")
      write.run(() =>
        requestCorrections({
          projectId,
          versionId: version.id,
          commentIds: [...kept],
          recipient,
          dueOn,
          message,
        }),
      );
    else
      write.run(() =>
        decidePostVersion({ projectId, versionId: version.id, decision, note }),
      );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`${id}-choice`}
          legend={t.legend}
          required
          columns={3}
          value={decision}
          onChange={(next) => {
            setDecision(next);
            setMissing(new Set());
          }}
          choices={VERSION_DECISIONS.map((d) => ({
            value: d,
            label: t.choices[d].label,
            hint: t.choices[d].hint,
          }))}
        />
        {missing.has("choice") && (
          <FieldError id={`${id}-choice-error`}>{t.choiceMissing}</FieldError>
        )}
      </div>

      {decision === "changes" ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{tc.comments}</legend>
            <p className="text-xs text-muted-foreground">
              {pending.length > 0 ? tc.commentsHint : tc.noComments}
            </p>
            {pending.map((c) => (
              <CheckboxField
                key={c.id}
                label={`${timecodeLabel(c.timecodeMs)} — ${c.body}`}
                hint={fr.productionPost.comments.categories[c.category]}
                checked={kept.has(c.id)}
                onChange={(on) =>
                  setKept((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(c.id);
                    else next.delete(c.id);
                    return next;
                  })
                }
              />
            ))}
          </fieldset>
          <CorrectionFields
            idPrefix={id}
            people={people}
            recipient={recipient}
            onRecipient={setRecipient}
            dueOn={defaults.dueOn}
            message={null}
            missing={
              new Set(
                [...missing].filter(
                  (m): m is CorrectionMissing => m !== "choice" && m !== "note",
                ),
              )
            }
          />
        </>
      ) : (
        <TextareaField
          id={`${id}-note`}
          name="note"
          label={t.note}
          hint={t.noteHint}
          rows={3}
          maxLength={2000}
          required={decision === "refuse"}
          error={missing.has("note") ? t.noteMissing : undefined}
        />
      )}
      {missing.size > 0 && !missing.has("choice") && (
        <FormMessage kind="error">{tc.missingCount(missing.size)}</FormMessage>
      )}
      <FormMessage kind="error">{write.error}</FormMessage>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={write.pending}
          aria-busy={write.pending || undefined}
        >
          {write.pending
            ? fr.productionPost.saving
            : decision === "changes"
              ? tc.submit
              : t.submit}
        </Button>
      </div>
    </form>
  );
}
