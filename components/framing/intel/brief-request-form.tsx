"use client";

import { IconPlus, IconTrash } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BriefRequestInput } from "@/lib/framing/actions/brief-versions";
import {
  DIMENSIONS,
  questionsOf,
  type Dimension,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { dialogs, framingIntel, briefRequests };

type Row = BriefRequestInput & { id: number };

const WHOLE = "whole";

/**
 * « Demander une modification » as a list (PROJ-UX-06): one request per
 * point to correct, each anchored to its dimension and, when it names one,
 * its question, mandatory or not. Missing texts turn red at the first try,
 * never before; the button stays active (docs/DESIGN.md § 4).
 */
export function BriefRequestForm({
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (requests: BriefRequestInput[], comment: string) => void;
  onCancel: () => void;
}) {
  const t = fr.briefRequests.form;
  const ti = fr.framingIntel;
  const next = useRef(1);
  const [rows, setRows] = useState<Row[]>([
    {
      id: 0,
      dimension: "objective",
      questionKey: null,
      body: "",
      mandatory: true,
    },
  ]);
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (id: number, change: Partial<Row>) =>
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const missing = rows.filter((r) => !r.body.trim());
  const dimensionOptions = Object.fromEntries(
    DIMENSIONS.map((d, index) => [
      d,
      `${ti.dimensionNumber(index)} ${ti.dimensions[d]}`,
    ]),
  );
  const questionOptions = (d: Dimension) => ({
    [WHOLE]: t.wholeDimension,
    ...Object.fromEntries(
      questionsOf(d).map((key) => [key, ti.questions[key].label]),
    ),
  });

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (missing.length > 0) {
          formRef.current
            ?.querySelector<HTMLTextAreaElement>(
              `#request-body-${missing[0].id}`,
            )
            ?.focus();
          return;
        }
        onSubmit(
          rows.map((r) => ({
            dimension: r.dimension,
            questionKey: r.questionKey,
            body: r.body.trim(),
            mandatory: r.mandatory,
          })),
          comment.trim(),
        );
      }}
    >
      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const bodyError =
            tried && !row.body.trim() ? t.missingBody : undefined;
          return (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-md font-semibold">
                  {t.request(index + 1)}
                </p>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.remove}
                    onClick={() =>
                      setRows((all) => all.filter((r) => r.id !== row.id))
                    }
                  >
                    <IconTrash aria-hidden />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`request-dimension-${row.id}`} required>
                    {t.dimension}
                  </Label>
                  <OptionSelect
                    id={`request-dimension-${row.id}`}
                    label={t.dimension}
                    required
                    options={dimensionOptions}
                    value={row.dimension}
                    onChange={(v) =>
                      set(row.id, {
                        dimension: v as Dimension,
                        questionKey: null,
                      })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`request-question-${row.id}`}>
                    {t.question}
                  </Label>
                  <OptionSelect
                    id={`request-question-${row.id}`}
                    label={t.question}
                    options={questionOptions(row.dimension)}
                    value={row.questionKey ?? WHOLE}
                    onChange={(v) =>
                      set(row.id, {
                        questionKey: v === WHOLE ? null : (v as QuestionKey),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`request-body-${row.id}`} required>
                  {t.body}
                </Label>
                <Textarea
                  id={`request-body-${row.id}`}
                  rows={3}
                  maxLength={2000}
                  value={row.body}
                  required
                  aria-invalid={bodyError ? true : undefined}
                  aria-describedby={
                    bodyError ? `request-body-${row.id}-error` : undefined
                  }
                  onChange={(e) => set(row.id, { body: e.target.value })}
                />
                <FieldError id={`request-body-${row.id}-error`}>
                  {bodyError}
                </FieldError>
              </div>
              <CheckboxField
                label={t.mandatory}
                hint={t.mandatoryHint}
                checked={row.mandatory}
                onChange={(checked) => set(row.id, { mandatory: checked })}
              />
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={rows.length >= 30}
        onClick={() => {
          const last = rows[rows.length - 1];
          setRows((all) => [
            ...all,
            {
              id: next.current++,
              dimension: last?.dimension ?? "objective",
              questionKey: null,
              body: "",
              mandatory: true,
            },
          ]);
        }}
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.add}
      </Button>
      <div className="grid gap-1.5">
        <Label htmlFor="brief-general-comment">{t.comment}</Label>
        <Textarea
          id="brief-general-comment"
          rows={2}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {tried && missing.length > 0 && (
        <FormMessage kind="error">{t.missingCount(missing.length)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          {fr.dialogs.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.framingIntel.brief.sending : t.submit(rows.length)}
        </Button>
      </div>
    </form>
  );
}
