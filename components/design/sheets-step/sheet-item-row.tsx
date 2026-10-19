"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { Input } from "@/components/ui/input";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveSheetItem } from "@/lib/design/actions/sheet-step";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.sheets;

/**
 * An element of a series (proto subRow): « Teaser 1 · <état de la fiche> »,
 * its objective, « Publié le · Sam. 28/11/2026 » (proposed from the launch
 * calendar until written), and « Modifier » for the sheet's responsible.
 */
export function SheetItemRow({
  projectId,
  item,
  line,
  dateText,
  dateSource,
  editable,
}: {
  projectId: string;
  item: { id: string; objective: string | null; date: string | null };
  // « Teaser 1 · Brouillon »
  line: string;
  dateText: string | null;
  dateSource: string | null;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [objective, setObjective] = useState(item.objective ?? "");
  const [date, setDate] = useState(item.date ?? "");
  const { pending, error, run } = useWriteSubmit(
    () => setEditing(false),
    t.saved,
  );
  if (editing)
    return (
      <FactRowFrame
        label={line}
        value={
          <span className="flex flex-col gap-1.5 pt-0.5">
            <span className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label={t.itemObjective}
                value={objective}
                maxLength={2000}
                autoFocus
                onChange={(e) => setObjective(e.target.value)}
              />
              <Input
                type="date"
                aria-label={t.itemDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </span>
            <FieldError id={`item-${item.id}-error`}>
              {error ?? undefined}
            </FieldError>
          </span>
        }
        side={
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() =>
                  saveSheetItem({
                    projectId,
                    itemId: item.id,
                    objective,
                    publishDate: date,
                  }),
                )
              }
            >
              {t.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t.cancel}
            </Button>
          </>
        }
      />
    );
  return (
    <FactRowFrame
      label={line}
      value={
        item.objective ? (
          <b className="font-semibold">{item.objective}</b>
        ) : (
          <span className="text-[color:var(--text-tertiary)]">
            {t.notFilled}
          </span>
        )
      }
      source={
        dateText
          ? `${t.publishedOn(dateText)}${dateSource ? ` · ${dateSource}` : ""}`
          : t.noPublish
      }
      side={
        editable ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            {t.edit}
          </Button>
        ) : undefined
      }
    />
  );
}
