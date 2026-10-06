"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { saveSplitDraft } from "@/lib/legal/splits/actions";
import type { SplitLine } from "@/lib/legal/splits/queries";
import {
  FULL,
  SPLIT_ROLES,
  equalUnits,
  exactShare,
  formatShare,
  totalUnits,
  unitsOf,
  type SplitRole,
} from "@/lib/legal/splits/shares";

type Row = {
  key: number;
  name: string;
  role: SplitRole;
  share: string;
  contactId: string | null;
  creditId: string | null;
};

/**
 * The split of one title, line by line: name, role, exact share. « Parts
 * égales » computes shares that total exactly 100 %; the total is checked
 * here and again by the database before anything is sent.
 */
export function SplitEditor({
  projectId,
  masterId,
  initial,
  withNote,
  onDone,
  onCancel,
}: {
  projectId: string;
  masterId: string;
  initial: SplitLine[];
  // A version after the first: why it changes.
  withNote: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = fr.legalSplits.editor;
  const [rows, setRows] = useState<Row[]>(() =>
    (initial.length > 0
      ? initial
      : [
          {
            name: "",
            role: "composer" as SplitRole,
            units: FULL,
            contactId: null,
            creditId: null,
          },
        ]
    ).map((line, i) => ({
      key: i,
      name: line.name,
      role: line.role,
      share: exactShare(line.units),
      contactId: line.contactId,
      creditId: line.creditId,
    })),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const units = rows.map((row) => unitsOf(row.share));
  const total = totalUnits(units);
  const set = (key: number, change: Partial<Row>) =>
    setRows((all) =>
      all.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  const equal = () => {
    const parts = equalUnits(rows.length);
    setRows((all) =>
      all.map((row, i) => ({ ...row, share: exactShare(parts[i]) })),
    );
  };

  function save() {
    if (rows.some((row) => !row.name.trim()) || units.some((u) => u === null))
      return setError(t.invalid);
    startTransition(async () => {
      const result = await saveSplitDraft({
        projectId,
        masterId,
        note,
        lines: rows.map((row) => ({
          name: row.name,
          role: row.role,
          share: row.share,
          contactId: row.contactId,
          creditId: row.creditId,
        })),
      });
      if (!result.ok) return setError(result.error);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_8rem_auto] sm:items-end"
          >
            <Field
              name={`name-${row.key}`}
              label={t.name}
              maxLength={200}
              value={row.name}
              onChange={(event) => set(row.key, { name: event.target.value })}
            />
            <OptionSelect
              name={`role-${row.key}`}
              label={t.role}
              items={Object.fromEntries(
                SPLIT_ROLES.map((r) => [r, fr.legalSplits.roles[r]]),
              )}
              defaultValue={row.role}
              onValueChange={(value) =>
                set(row.key, { role: value as SplitRole })
              }
            />
            <Field
              name={`share-${row.key}`}
              label={t.share}
              inputMode="decimal"
              suffix="%"
              value={row.share}
              onChange={(event) => set(row.key, { share: event.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.remove(row.name)}
              disabled={rows.length === 1}
              onClick={() =>
                setRows((all) => all.filter((r) => r.key !== row.key))
              }
            >
              <IconXmark aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((all) => [
                ...all,
                {
                  key: Math.max(...all.map((r) => r.key)) + 1,
                  name: "",
                  role: "composer",
                  share: "",
                  contactId: null,
                  creditId: null,
                },
              ])
            }
          >
            <IconPlus aria-hidden />
            {t.add}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={equal}>
            {t.equal}
          </Button>
        </div>
        <span
          className={
            total === FULL
              ? "font-medium"
              : "font-medium text-[color:var(--tone-warning-fg)]"
          }
          aria-live="polite"
        >
          {total === FULL ? t.totalOk : t.totalOff(formatShare(total))}
        </span>
      </div>
      {withNote && (
        <Field
          name="note"
          label={t.note}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.legalSplits.public.cancel}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={save}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
