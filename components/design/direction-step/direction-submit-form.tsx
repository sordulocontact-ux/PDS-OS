"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { DesignBlock } from "@/components/design/design-block";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { submitDirectionStep } from "@/lib/design/actions/direction-step";
import type { DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.direction;

export type DirectionRow = {
  topic: DesignTopic;
  label: string;
  value: string | null;
  source: string | null;
};
export type DirectionSection = {
  // A deliverable id; null: the release's direction (always submitted).
  id: string | null;
  title: string;
  meta: string;
  submitted: boolean;
};

/**
 * The Direction artistique as it is submitted (proto de2): the four points
 * of the release's direction — confirmed with their source, or written on
 * the spot when nobody said them — then « Ce qui est soumis », a box per
 * deliverable, and « Soumettre à … ». Read only for the others.
 */
export function DirectionSubmitForm({
  projectId,
  rows,
  sections,
  who,
  editable,
  creative,
  submitLabel,
}: {
  projectId: string;
  rows: DirectionRow[];
  sections: DirectionSection[];
  who: string;
  editable: boolean;
  creative: string;
  submitLabel: string;
}) {
  const [written, setWritten] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [chosen, setChosen] = useState(
    sections.flatMap((s) => (s.id ? [s.id] : [])),
  );
  const { pending, error, run } = useWriteSubmit(() => undefined, "");
  const submit = () => {
    const missing = Object.fromEntries(
      rows
        .filter((r) => !r.value && !written[r.topic]?.trim())
        .map((r) => [r.topic, true]),
    );
    setErrors(missing);
    const first = Object.keys(missing)[0];
    if (first) return document.getElementById(`dir-${first}`)?.focus();
    run(() => submitDirectionStep({ projectId, sections: chosen, written }));
  };
  return (
    <>
      <DesignBlock title={t.title}>
        <FactRows>
          {rows.map((r) => (
            <FactRow
              key={r.topic}
              label={r.label}
              value={
                r.value ? (
                  <b className="font-semibold">{r.value}</b>
                ) : editable ? (
                  <span className="flex flex-col gap-1 pt-1">
                    <Input
                      id={`dir-${r.topic}`}
                      placeholder={t.toWrite}
                      maxLength={2000}
                      aria-invalid={errors[r.topic] || undefined}
                      value={written[r.topic] ?? ""}
                      onChange={(e) =>
                        setWritten({ ...written, [r.topic]: e.target.value })
                      }
                    />
                    <FieldError id={`dir-${r.topic}-error`}>
                      {errors[r.topic] ? t.writeRequired : undefined}
                    </FieldError>
                  </span>
                ) : (
                  <span className="font-semibold text-error">
                    {t.writeBy(creative)}
                  </span>
                )
              }
              source={r.value ? r.source : null}
            />
          ))}
        </FactRows>
      </DesignBlock>
      <DesignBlock title={t.submitted}>
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
          {who}
        </span>
        <FactRows>
          {sections.map((s) => (
            <FactRow
              key={s.id ?? "direction"}
              value={<b className="font-semibold">{s.title}</b>}
              source={s.meta}
              side={
                editable ? (
                  <label className="flex items-center gap-2 text-body-sm">
                    <Checkbox
                      checked={!s.id || chosen.includes(s.id)}
                      disabled={!s.id || pending}
                      onChange={(e) => {
                        const id = s.id;
                        if (!id) return;
                        setChosen(
                          e.target.checked
                            ? [...chosen, id]
                            : chosen.filter((x) => x !== id),
                        );
                      }}
                    />
                    {t.submit}
                  </label>
                ) : s.submitted ? (
                  <StatusBadge tone="neutral" size="sm">
                    {t.sectionSubmitted}
                  </StatusBadge>
                ) : undefined
              }
            />
          ))}
        </FactRows>
      </DesignBlock>
      {editable && (
        <div className="flex flex-col gap-2">
          <FieldError id="direction-submit-error">
            {error ?? undefined}
          </FieldError>
          <Button
            className="self-start"
            disabled={pending}
            aria-busy={pending}
            onClick={submit}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </>
  );
}
