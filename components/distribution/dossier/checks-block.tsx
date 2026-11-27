"use client";

import { useState } from "react";

import { IconBan } from "@/components/icons";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { FactRows } from "@/components/ui/fact-row";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CheckKey, CheckResult } from "@/lib/distribution/checks";
import { recordDistributionCheck } from "@/lib/distribution/validation-actions";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { cn } from "@/lib/utils";
import { useDistributionRelease } from "@/components/distribution/frame/release-scope";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.checks;
const c = fr.distribution.checks;

export type CheckLine = {
  key: CheckKey;
  result: CheckResult;
  note: string | null;
  // « Contrôlé par Lina Haddad le 23/11, 10:25 ».
  by: string | null;
  computed: { status: "coherent" | "gap" | "human"; text: string };
};

const TONE = {
  compliant: "success",
  non_compliant: "danger",
  not_applicable: "neutral",
} as const;

/**
 * The six consistency checks (proto `checksBlock`): what each one checks,
 * PDS OS's own reading beside it (never « Conforme »), who recorded it and
 * when; Conforme / Non conforme / Non applicable on the line, « Non
 * conforme » asking what does not match before it is recorded.
 */
export function ChecksBlock({
  projectId,
  checks,
  editable,
  coverFromTitle = false,
}: {
  projectId: string;
  checks: CheckLine[];
  editable: boolean;
  // A title's release (lot 15): its cover is the title's, in the Catalogue.
  coverFromTitle?: boolean;
}) {
  const recorded = checks.filter((k) => k.result !== "unchecked").length;
  return (
    <section className="flex flex-col gap-2.5 modern:gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
          {t.title}
        </h3>
        <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.count(recorded)}
        </span>
      </div>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.body}
      </p>
      <FactRows>
        {checks.map((check) => (
          <CheckRow
            key={check.key}
            projectId={projectId}
            check={check}
            editable={editable}
            coverFromTitle={coverFromTitle}
          />
        ))}
      </FactRows>
    </section>
  );
}

function CheckRow({
  projectId,
  check,
  editable,
  coverFromTitle,
}: {
  projectId: string;
  check: CheckLine;
  editable: boolean;
  coverFromTitle: boolean;
}) {
  const releaseId = useDistributionRelease();
  const [changing, setChanging] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setChanging(false);
    setNoting(false);
    setNote("");
  }, t.recorded);
  const record = (result: CheckResult, text = "") =>
    run(() =>
      recordDistributionCheck({
        projectId,
        releaseId,
        key: check.key,
        result,
        note: text,
      }),
    );
  const done = check.result !== "unchecked";
  const ask = editable && (!done || changing) && !noting;
  const item = c.items[check.key];
  return (
    <FactRowFrame
      value={<b className="font-semibold">{item.label}</b>}
      sourceNode={
        <span className="flex flex-col gap-0.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          <span>
            {check.key === "visual" && coverFromTitle
              ? c.visualTitleWhat
              : item.what}
          </span>
          <span>
            {c.computedLabel} :{" "}
            <span
              className={cn(
                check.computed.status === "gap" &&
                  "font-semibold text-[color:var(--tone-warning-fg)]",
              )}
            >
              {c.computedStatus[check.computed.status]}
            </span>{" "}
            · {check.computed.text}
          </span>
          <span>
            {check.by ?? t.nobody}
            {check.note ? ` : « ${check.note} »` : ""}
          </span>
        </span>
      }
      state={
        done && !changing
          ? {
              tone: TONE[check.result as keyof typeof TONE],
              label: c.results[check.result],
            }
          : null
      }
      side={
        ask ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => record("compliant")}
            >
              {c.results.compliant}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setNoting(true)}
            >
              {c.results.non_compliant}
            </Button>
            {/* Never three text buttons: the rare verdict goes in « ⋯ ». */}
            <RowActions
              label={t.more}
              actions={[
                {
                  key: "not_applicable",
                  label: c.results.not_applicable,
                  icon: IconBan,
                  onSelect: () => record("not_applicable"),
                },
              ]}
            />
          </>
        ) : editable && done && !noting ? (
          <Button size="sm" variant="ghost" onClick={() => setChanging(true)}>
            {t.change}
          </Button>
        ) : null
      }
      below={
        noting ? (
          <div className="flex flex-col gap-2 pt-1">
            <TextareaField
              name={`check-${check.key}`}
              label={t.note}
              required
              rows={2}
              maxLength={1000}
              placeholder={t.notePlaceholder}
              value={note}
              autoFocus
              onChange={(e) => setNote(e.target.value)}
              error={missing ? t.noteRequired : undefined}
            />
            <FormMessage kind="error">{error}</FormMessage>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() => {
                  const lacking = !note.trim();
                  setMissing(lacking);
                  if (!lacking) record("non_compliant", note.trim());
                }}
              >
                {t.save}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNoting(false)}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        ) : error ? (
          <FormMessage kind="error">{error}</FormMessage>
        ) : undefined
      }
    />
  );
}
