"use client";

import { Field } from "@/components/auth/field";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { formatFee } from "@/lib/legal/contracts/fields";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fr = { legalClearance };

/** One line of conditions, as the person may correct it before it goes to
 * the direction: per right (the work, the recording) when the answer says
 * so, the amount in euros as typed, the rest as written (UX test of
 * 09/10/2026: a second rights holder's 25 % was lost). */
export type TermsLine = {
  right: "work" | "master" | null;
  amount: string;
  share: string;
  credits: string;
  territory: string;
  duration: string;
};

export const eurosOf = (cents: number | null) =>
  cents === null ? "" : String(cents / 100).replace(".", ",");

// « 2 000 € HT », « 2000,50 »… → cents; null when empty, undefined when it
// is not an amount: then said on the field, never sent as "no amount".
export const centsOf = (amount: string) =>
  parseEurosToCents(amount.replace(/\b(HT|TTC)\b/gi, ""));

const amountName = (clearanceId: string, index: number) =>
  `amount-${clearanceId}-${index}`;

/** Focus the first amount that is not one; its index, or -1. */
export function firstBadAmount(clearanceId: string, lines: TermsLine[]) {
  const index = lines.findIndex((line) => centsOf(line.amount) === undefined);
  if (index >= 0)
    document.getElementsByName(amountName(clearanceId, index))[0]?.focus();
  return index;
}

export function TermsLinesEditor({
  clearanceId,
  lines,
  badAmounts,
  onChange,
}: {
  clearanceId: string;
  lines: TermsLine[];
  // Lines whose amount was refused at the last try.
  badAmounts: ReadonlySet<number>;
  onChange: (lines: TermsLine[]) => void;
}) {
  const t = fr.legalClearance.flow;
  const set = (index: number, patch: Partial<TermsLine>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  return (
    <div className="flex flex-col gap-4">
      {lines.map((line, index) => (
        <div key={index} className="flex flex-col gap-2">
          {line.right && (
            <span className="text-sm font-medium">
              {fr.legalClearance.rights[line.right]}
            </span>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              name={amountName(clearanceId, index)}
              label={t.amount}
              inputMode="decimal"
              suffix="€"
              value={line.amount}
              error={badAmounts.has(index) ? t.amountInvalid : undefined}
              onChange={(event) => set(index, { amount: event.target.value })}
            />
            <Field
              name={`share-${clearanceId}-${index}`}
              label={t.share}
              value={line.share}
              onChange={(event) => set(index, { share: event.target.value })}
            />
            <Field
              name={`credits-${clearanceId}-${index}`}
              label={t.credits}
              value={line.credits}
              onChange={(event) => set(index, { credits: event.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The conditions waiting for the direction, one line per right. */
export function TermsSummary({
  terms,
}: {
  terms: Array<{
    id: string;
    right: "work" | "master" | null;
    amountCents: number | null;
    share: string | null;
    credits: string | null;
    territory: string | null;
    duration: string | null;
  }>;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {terms.map((line) => (
        <li key={line.id} className="font-medium break-words">
          {line.right && (
            <span className="text-muted-foreground">
              {fr.legalClearance.rights[line.right]} ·{" "}
            </span>
          )}
          {[
            line.amountCents !== null ? formatFee(line.amountCents) : null,
            line.share,
            line.credits,
            line.territory,
            line.duration,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </li>
      ))}
    </ul>
  );
}
