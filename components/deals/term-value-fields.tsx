"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { termInputs } from "@/lib/deals/term-input";
import type { TermFormat, TermValue } from "@/lib/deals/terms";
import { deals } from "@/lib/i18n/fr/deals";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { SPLIT_ROLES } from "@/lib/legal/splits/shares";

const fr = { deals, legalSplits };

/**
 * The value of a term in its format (BIZ 3), prefilled: free words, a share,
 * an advance or a fee, yes or no with a detail, or shares by the
 * Juridique's roles (one field per role, empty = not in the deal). Names
 * read back by lib/deals/term-input.ts.
 */
export function TermValueFields({
  id,
  format,
  value,
  error,
}: {
  id: string;
  format: TermFormat;
  value: TermValue | null;
  error?: string;
}) {
  const t = fr.deals.terms;
  const start = termInputs(format, value);
  const [mode, setMode] = useState<"advance" | "fee">(
    start.mode === "fee" ? "fee" : "advance",
  );
  const [yes, setYes] = useState<"yes" | "no" | null>(
    start.yesno === "yes" || start.yesno === "no" ? start.yesno : null,
  );

  return (
    <div data-term-value className="flex flex-col gap-4">
      {format === "text" && (
        <TextareaField
          id={`${id}-text`}
          name="text"
          label={t.fields.text}
          required
          rows={3}
          maxLength={1000}
          defaultValue={start.text}
          error={error}
        />
      )}
      {format === "percent" && (
        <Field
          id={`${id}-percent`}
          name="percent"
          label={t.fields.percent}
          required
          inputMode="decimal"
          suffix="%"
          defaultValue={start.percent}
          error={error}
        />
      )}
      {format === "money" && (
        <>
          <ChipChoice
            name="mode"
            legend={t.fields.mode}
            required
            options={(["advance", "fee"] as const).map((v) => ({
              value: v,
              label: t.moneyModes[v],
            }))}
            value={mode}
            onChange={(v) => v && setMode(v)}
          />
          <Field
            id={`${id}-amount`}
            name="amount"
            label={t.fields.amount}
            required
            inputMode="decimal"
            suffix="€"
            defaultValue={start.amount}
            error={error}
          />
        </>
      )}
      {format === "yesno" && (
        <>
          <ChipChoice
            name="yesno"
            legend={t.fields.yesno}
            required
            options={[
              { value: "yes" as const, label: t.yes },
              { value: "no" as const, label: t.no },
            ]}
            value={yes}
            onChange={setYes}
            error={error}
          />
          <Field
            id={`${id}-detail`}
            name="detail"
            label={t.fields.detail}
            maxLength={1000}
            defaultValue={start.detail}
          />
        </>
      )}
      {format === "split" && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">{t.labels.songwriting_split}</legend>
          {SPLIT_ROLES.map((role) => (
            <Field
              key={role}
              id={`${id}-${role}`}
              name={`share-${role}`}
              label={fr.legalSplits.roles[role]}
              inputMode="decimal"
              suffix="%"
              defaultValue={start[`share-${role}`]}
              error={role === SPLIT_ROLES[0] ? error : undefined}
            />
          ))}
        </fieldset>
      )}
    </div>
  );
}
