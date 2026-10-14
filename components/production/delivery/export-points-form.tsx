"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { checkExportPoints } from "@/lib/production/delivery/check-actions";
import { EXPORT_POINTS } from "@/lib/production/delivery/points";
import type { ExportCheckLine } from "@/lib/production/delivery/rules";

const t = fr.productionClosure.points;
type Result = "ok" | "not_ok";

/**
 * « Contrôler » (PROD-037): the points of the file's kind, each conforming
 * or not, a failing one with what is wrong. Prefilled with the points
 * already checked on this file; a point left blank stays to check.
 */
export function ExportPointsForm({
  projectId,
  line,
  onDone,
}: {
  projectId: string;
  line: ExportCheckLine;
  onDone: () => void;
}) {
  const keys = EXPORT_POINTS[line.kind];
  const [results, setResults] = useState<Record<string, Result | null>>(() =>
    Object.fromEntries(
      keys.map((key) => [
        key,
        line.points.find((p) => p.key === key)?.result ?? null,
      ]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const points = keys.flatMap((key) => {
      const result = results[key];
      if (!result) return [];
      const note = String(data.get(`note-${key}`) ?? "").trim();
      return [{ key, result, note }];
    });
    const next = Object.fromEntries(
      points
        .filter((p) => p.result === "not_ok" && p.note === "")
        .map((p) => [p.key, t.noteRequired]),
    );
    setErrors(next);
    setMissing(points.length === 0 ? t.nothing : null);
    const first = Object.keys(next)[0];
    if (first) {
      form
        .querySelector<HTMLTextAreaElement>(`textarea[name=note-${first}]`)
        ?.focus();
      return;
    }
    if (points.length === 0) return;
    run(() => checkExportPoints({ projectId, lineId: line.id, points }));
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      {keys.map((key) => (
        <div key={key} className="flex flex-col gap-3">
          <ChipChoice<Result>
            name={`result-${key}`}
            legend={t.labels[key] ?? key}
            options={[
              { value: "ok", label: t.ok },
              { value: "not_ok", label: t.notOk },
            ]}
            value={results[key]}
            onChange={(value) =>
              setResults((current) => ({ ...current, [key]: value }))
            }
            deselectable
          />
          {results[key] === "not_ok" && (
            <TextareaField
              name={`note-${key}`}
              label={t.note}
              required
              rows={2}
              maxLength={500}
              defaultValue={
                line.points.find((p) => p.key === key)?.note ?? undefined
              }
              error={errors[key]}
            />
          )}
        </div>
      ))}
      {missing && <FormMessage kind="error">{missing}</FormMessage>}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        onCancel={onDone}
      />
    </form>
  );
}
