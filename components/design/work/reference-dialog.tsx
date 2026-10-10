"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDesignReference } from "@/lib/design/actions/references";
import { fr } from "@/lib/i18n/fr";

/** « Ajouter une référence »: a link and what to keep from it. */
export function ReferenceDialog({
  projectId,
  deliverableId,
}: {
  projectId: string;
  // Null: a reference of the overall direction.
  deliverableId: string | null;
}) {
  const t = fr.conceptionWork.references;
  const [open, setOpen] = useState(false);
  const { pending, run } = useDesignAction();

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden />
        {t.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={t.cancel}
      >
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            run(
              () =>
                addDesignReference(
                  projectId,
                  deliverableId,
                  String(values.get("url") ?? ""),
                  String(values.get("note") ?? ""),
                ),
              { success: t.added, onSuccess: () => setOpen(false) },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="design-reference-url" required>
              {t.urlLabel}
            </Label>
            <Input
              id="design-reference-url"
              name="url"
              type="url"
              required
              maxLength={2000}
              pattern="https://.+"
              title={t.urlInvalid}
              placeholder={t.urlPlaceholder}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="design-reference-note">{t.noteLabel}</Label>
            <Textarea
              id="design-reference-note"
              name="note"
              maxLength={500}
              rows={2}
              placeholder={t.notePlaceholder}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t.submitting : t.submit}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
