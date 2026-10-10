"use client";

import { useState } from "react";

import { SheetItemForm } from "@/components/design/sheets/sheet-item-form";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import {
  addSheetItem,
  removeSheetItem,
  updateSheetItem,
} from "@/lib/design/actions/sheet-items";
import type { SubmissionStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

export type SheetItemView = {
  id: string;
  number: number;
  title: string;
  objective: string | null;
  deliveryDate: string | null;
  notes: string | null;
  // Its own decision in the latest version, if decided.
  decision: Exclude<SubmissionStatus, "pending"> | null;
};

type Editing = { item: SheetItemView | null } | null;

/**
 * The numbered items of a series: each keeps its objective, date, notes and
 * its own decision. As many as the series needs, added or taken back while
 * the sheet can be edited.
 */
export function SheetItems({
  projectId,
  sheetId,
  items,
  canEdit,
}: {
  projectId: string;
  sheetId: string;
  items: SheetItemView[];
  canEdit: boolean;
}) {
  const t = fr.conceptionSheet.items;
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<SheetItemView | null>(null);
  const { pending, run } = useDesignAction();
  const close = () => setEditing(null);
  const item = editing?.item ?? null;

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-xl border border-border p-4"
            >
              <span className="text-caption font-medium text-muted-foreground tabular-nums">
                {t.number(i.number)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-md font-medium break-words">
                  {i.title}
                </span>
                {i.objective && (
                  <span className="text-body-md break-words text-muted-foreground">
                    {i.objective}
                  </span>
                )}
                <span className="text-caption text-muted-foreground tabular-nums">
                  {[
                    i.deliveryDate
                      ? `${t.deliveryDate} · ${formatDay(i.deliveryDate)}`
                      : null,
                    i.notes,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {i.decision ? (
                <StatusBadge tone={designReviewTone[i.decision]} size="sm">
                  {fr.conception.decided[i.decision]}
                </StatusBadge>
              ) : (
                <span className="text-caption text-muted-foreground">
                  {t.undecided}
                </span>
              )}
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t.editLabel(i.title)}
                    onClick={() => setEditing({ item: i })}
                  >
                    {t.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t.removeLabel(i.title)}
                    onClick={() => setRemoving(i)}
                  >
                    {t.remove}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {canEdit && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setEditing({ item: null })}
        >
          {t.add}
        </Button>
      )}

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && close()}
        title={item ? item.title : t.add}
        description={fr.conceptionSheet.sections.items}
        closeLabel={fr.conceptionSheet.create.close}
      >
        <SheetItemForm
          initial={{
            title: item?.title ?? "",
            objective: item?.objective ?? "",
            deliveryDate: item?.deliveryDate ?? "",
            notes: item?.notes ?? "",
          }}
          save={(input) =>
            item
              ? updateSheetItem(projectId, item.id, input)
              : addSheetItem(projectId, sheetId, input)
          }
          success={item ? t.saved : t.added}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing ? t.removeLabel(removing.title) : ""}
        description={fr.conceptionSheet.sections.items}
        cancelLabel={t.cancel}
        closeLabel={fr.conceptionSheet.create.close}
        confirmLabel={t.remove}
        pending={pending}
        destructive
        onConfirm={() =>
          removing &&
          run(() => removeSheetItem(projectId, removing.id), {
            success: t.removed,
            onSuccess: () => setRemoving(null),
          })
        }
      />
    </div>
  );
}
