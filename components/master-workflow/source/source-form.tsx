"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { confirmSource } from "@/lib/master-workflow/source-actions";
import type { SourceTitle } from "@/lib/master-workflow/source-step";
import { formatDay, formatShortDay } from "@/lib/utils/day";

import { SourceAudio } from "./source-audio";

const t = fr.masterSource;

/**
 * « Dernière version détectée » then the vocals and, when they are not
 * final, « Attendre / Anticiper » (proto `master-v2.html`): the newest
 * version chosen first, each one listened to before choosing, every missing
 * answer in red at the first try (never a disabled button).
 */
export function SourceForm({
  projectId,
  title,
  mixV1Due,
  checked,
  onCancel,
}: {
  projectId: string;
  title: SourceTitle;
  mixV1Due: string | null;
  // « Ce que PDS OS a vérifié », between the versions and the vocals.
  checked?: React.ReactNode;
  // « Annuler » when the form reopens a confirmed source.
  onCancel?: () => void;
}) {
  const detected = title.candidates[0];
  const [fileId, setFileId] = useState<string | null>(
    title.current?.version?.id ?? detected?.id ?? null,
  );
  const [vocals, setVocals] = useState<"yes" | "no" | null>(null);
  const [plan, setPlan] = useState<"wait" | "anticipate" | null>(null);
  const [pending, setPendingText] = useState("");
  const [tried, setTried] = useState(false);
  const first = useRef<HTMLDivElement>(null);
  const submit = useWriteSubmit(() => onCancel?.(), t.done);
  const chosen = title.candidates.find((c) => c.id === fileId);
  const errors = {
    version: !fileId ? t.errors.version : undefined,
    vocals: !vocals ? t.errors.vocals : undefined,
    plan: vocals === "no" && !plan ? t.errors.plan : undefined,
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (errors.version || errors.vocals || errors.plan || !fileId) {
          first.current?.querySelector<HTMLInputElement>("input")?.focus();
          return;
        }
        submit.run(() =>
          confirmSource({
            projectId,
            masterId: title.id,
            fileId,
            vocalsFinal: vocals === "yes",
            vocalsPending: pending.trim() || null,
            plan: vocals === "no" ? plan : null,
          }),
        );
      }}
    >
      <div ref={first} className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`source-${title.id}`}
          legend={t.detected}
          required
          variant="list"
          value={fileId}
          onChange={setFileId}
          choices={title.candidates.map((c, i) => ({
            value: c.id,
            label: c.fileName,
            hint: t.versionMeta(
              // « v3 »: its rank among the title's versions, oldest first.
              title.candidates.length - i,
              fr.catalog.audioStates[c.audioState],
              c.addedBy,
              formatShortDay(c.createdAt),
              i === 0,
            ),
            aside: <SourceAudio name={c.fileName} url={c.listenUrl} />,
          }))}
        />
        {tried && (
          <FieldError id="source-version-error">{errors.version}</FieldError>
        )}
      </div>
      {checked}

      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`vocals-${title.id}`}
          legend={t.vocals.question}
          required
          columns={2}
          value={vocals}
          onChange={setVocals}
          choices={[
            { value: "yes", label: t.vocals.yesChoice, hint: t.vocals.yesHint },
            { value: "no", label: t.vocals.noChoice, hint: t.vocals.noHint },
          ]}
        />
        {tried && (
          <FieldError id="source-vocals-error">{errors.vocals}</FieldError>
        )}
      </div>

      {vocals === "no" && (
        <>
          <Field
            name={`pending-${title.id}`}
            label={t.vocals.pending}
            hint={t.vocals.pendingHint}
            value={pending}
            maxLength={200}
            onChange={(e) => setPendingText(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <ChoiceCards
              name={`plan-${title.id}`}
              legend={t.plan.legend}
              hint={t.plan.note}
              required
              value={plan}
              onChange={setPlan}
              choices={[
                {
                  value: "wait",
                  label: t.plan.wait,
                  hint: t.plan.waitHint(
                    title.artists,
                    mixV1Due ? formatDay(mixV1Due) : null,
                  ),
                },
                {
                  value: "anticipate",
                  label: t.plan.anticipate,
                  hint: t.plan.anticipateHint(chosen?.fileName ?? ""),
                },
              ]}
            />
            {tried && (
              <FieldError id="source-plan-error">{errors.plan}</FieldError>
            )}
          </div>
        </>
      )}

      <FormMessage kind="error">{submit.error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={submit.pending}
          aria-busy={submit.pending || undefined}
        >
          {submit.pending ? t.submitting : t.submit}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.current.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
