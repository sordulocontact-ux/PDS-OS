"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import type { Member } from "@/lib/framing/related";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";

const fr = { strategyDocuments };

export type ReserveDraft = {
  id: number;
  text: string;
  ownerPersonId: string;
  dueOn: string;
};

export type ReserveErrors = Record<
  number,
  Partial<Record<"text" | "ownerPersonId" | "dueOn", string>>
>;

/** What is missing in each reserve, said after the first try only. */
export function reserveErrors(
  rows: ReserveDraft[],
  today: string,
): ReserveErrors {
  const t = fr.strategyDocuments.reserves;
  const errors: ReserveErrors = {};
  for (const row of rows) {
    const e: ReserveErrors[number] = {};
    if (row.text.trim() === "") e.text = t.textRequired;
    if (!row.ownerPersonId) e.ownerPersonId = t.ownerRequired;
    if (!row.dueOn) e.dueOn = t.dueRequired;
    else if (row.dueOn < today) e.dueOn = t.duePast;
    if (Object.keys(e).length) errors[row.id] = e;
  }
  return errors;
}

/**
 * « Valider avec réserves » (MKT-S1-16): one row per reserve, what is to
 * lift, who lifts it (a member of PDS, an account of the app) and by when;
 * each becomes a task of its owner once the decision is sent.
 */
export function ReserveRows({
  rows,
  members,
  errors,
  onChange,
}: {
  rows: ReserveDraft[];
  members: Member[];
  errors: ReserveErrors;
  onChange: (rows: ReserveDraft[]) => void;
}) {
  const t = fr.strategyDocuments.reserves;
  const update = (id: number, patch: Partial<ReserveDraft>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-body-md font-semibold">{t.title}</legend>
      {/* One row per reserve, joined in one hairline frame. */}
      <Rows label={t.title}>
        {rows.map((row, index) => (
          <li key={row.id} className="flex flex-col gap-3 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-md font-medium">
                {t.number(index + 1)}
              </span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={t.remove(index + 1)}
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
              >
                <IconXmark aria-hidden />
              </Button>
            </div>
            <TextareaField
              id={`reserve-${row.id}-text`}
              name={`reserve-${row.id}-text`}
              label={t.text}
              aria-required
              rows={2}
              maxLength={1000}
              value={row.text}
              error={errors[row.id]?.text}
              onChange={(e) => update(row.id, { text: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionSelect
                id={`reserve-${row.id}-owner`}
                name={`reserve-${row.id}-owner`}
                label={t.owner}
                required
                items={Object.fromEntries(
                  members.map((m) => [m.personId, m.name]),
                )}
                defaultValue={row.ownerPersonId || null}
                error={errors[row.id]?.ownerPersonId}
                onValueChange={(value) =>
                  update(row.id, { ownerPersonId: value })
                }
              />
              <Field
                id={`reserve-${row.id}-due`}
                name={`reserve-${row.id}-due`}
                label={t.due}
                type="date"
                aria-required
                value={row.dueOn}
                error={errors[row.id]?.dueOn}
                onChange={(e) => update(row.id, { dueOn: e.target.value })}
              />
            </div>
          </li>
        ))}
      </Rows>
    </fieldset>
  );
}
