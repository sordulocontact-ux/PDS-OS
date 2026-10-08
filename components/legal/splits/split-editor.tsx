"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  SplitEditorRow,
  type SplitRow,
} from "@/components/legal/splits/split-editor-row";
import { useSplitRows } from "@/components/legal/splits/use-split-rows";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { saveSplitDraft } from "@/lib/legal/splits/actions";
import type { SplitLine } from "@/lib/legal/splits/queries";
import {
  FULL,
  formatShare,
  totalUnits,
  unitsOf,
} from "@/lib/legal/splits/shares";

/**
 * The split of one title, line by line: the person (picked, its contact
 * kept), role, exact share. « Parts égales » computes shares that total
 * exactly 100 %; the total is checked here and again by the database
 * before anything is sent.
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
  const { rows, set, load, add, remove, equal } = useSplitRows(
    masterId,
    initial,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  const units = rows.map((row) => unitsOf(row.share));
  const total = totalUnits(units);
  const errorsOf = (row: SplitRow, i: number) => ({
    person: row.name.trim() ? undefined : t.personMissing,
    share: units[i] === null ? t.shareInvalid : undefined,
  });
  const missing = rows.filter((row, i) => {
    const e = errorsOf(row, i);
    return e.person || e.share;
  }).length;
  // After a try, the first line in red takes the focus.
  useEffect(() => {
    if (!tried) return;
    root.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: true });
  }, [tried]);

  function save() {
    setError(null);
    if (missing > 0) return setTried((n) => n + 1);
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
    <div ref={root} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <SplitEditorRow
            key={row.key}
            row={row}
            load={load}
            canRemove={rows.length > 1}
            errors={tried ? errorsOf(row, i) : null}
            onChange={(change) => set(row.key, change)}
            onRemove={() => remove(row.key)}
          />
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={add}>
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
      <FormMessage kind="error">
        {error ?? (tried && missing > 0 ? t.missingCount(missing) : null)}
      </FormMessage>
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
