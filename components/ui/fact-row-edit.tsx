"use client";

import { useRef, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  FactRowFrame,
  factSourceWords,
  type FactEdit,
  type FactRowProps,
} from "@/components/ui/fact-row-frame";
import { Input } from "@/components/ui/input";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decisions } from "@/lib/i18n/fr/decisions";

const fr = { decisions };

const t = fr.decisions.fact;

// A native select drawn like `Input` (Entrée and Échap stay the row's).
const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-error aria-invalid:ring-3 aria-invalid:ring-error/20 md:text-sm";

/**
 * A fact edited in place (docs/VISION-UX.md rule 2, proto `dateRow`):
 * « Modifier » turns the value into its field, focused, with « Proposition :
 * <valeur> · <source> — Entrée enregistre, Échap annule. » under it and
 * « Enregistrer » / « Annuler » on the right. The module's refusal (dates
 * out of order…) shows in red under the field; once saved the module says
 * « Modifié par … » (`changedBy`).
 */
export function FactRowEditable({
  edit,
  ...row
}: FactRowProps & { edit: FactEdit }) {
  const [editing, setEditing] = useState(false);
  const [missing, setMissing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement & HTMLSelectElement>(null);
  const close = () => {
    setEditing(false);
    // Back to « Modifier », where the person was.
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const { pending, error, setError, run } = useWriteSubmit(
    close,
    edit.done ?? t.saved,
  );

  const open = () => {
    setError(null);
    setMissing(false);
    setEditing(true);
  };
  if (!editing && row.openOnRow)
    return (
      <FactRowFrame
        {...row}
        onClick={open}
        hoverAction={t.edit}
        buttonRef={editButton}
      />
    );
  if (!editing)
    return (
      <FactRowFrame
        {...row}
        side={
          <>
            {row.side}
            <Button
              ref={editButton}
              variant="ghost"
              size="sm"
              onClick={open}
            >
              {t.edit}
            </Button>
          </>
        }
      />
    );

  const id = `fact-${(row.label ?? "value").replace(/\W+/g, "-")}`;
  const errorId = `${id}-error`;
  const save = () => {
    const value = (field.current?.value ?? "").trim();
    const lacking = !value && !edit.optional;
    setMissing(lacking);
    if (lacking) return field.current?.focus();
    run(() => edit.onSave(value));
  };
  const shared = {
    id,
    ref: field,
    autoFocus: true,
    defaultValue: edit.value,
    disabled: pending,
    "aria-label": row.label,
    "aria-invalid": missing || Boolean(error) || undefined,
    "aria-describedby": missing || error ? errorId : `${id}-hint`,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        save();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    },
  };

  return (
    <FactRowFrame
      {...row}
      value={
        <span className="flex flex-col gap-1.5 pt-0.5">
          {edit.kind === "select" ? (
            <select {...shared} className={selectClass}>
              {Object.entries(edit.options ?? {}).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <Input {...shared} type={edit.kind ?? "text"} className="h-10" />
          )}
          <FieldError id={errorId}>
            {missing ? t.required : (error ?? undefined)}
          </FieldError>
        </span>
      }
      missing={false}
      changedBy={null}
      sourceNode={
        <span id={`${id}-hint`} className="text-caption text-muted-foreground">
          {t.proposal(
            edit.proposal ??
              (edit.kind === "select"
                ? (edit.options?.[edit.value] ?? edit.value)
                : edit.value),
            row.changedBy
              ? t.changedBy(row.changedBy)
              : factSourceWords(row.source),
          )}
        </span>
      }
      state={null}
      side={
        <>
          <Button
            size="sm"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={save}
          >
            {t.save}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={close}>
            {t.cancel}
          </Button>
        </>
      }
    />
  );
}
