"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { requestPostVersionChanges } from "@/lib/production/post/review-actions";

import { useWriteSubmit } from "@/components/ui/use-write-submit";

const t = fr.productionPost;

/** « Demander des corrections » on a version under review, with a message
 * to the provider. */
export function RequestChangesButton({
  projectId,
  versionId,
  name,
}: {
  projectId: string;
  versionId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { pending, error, run } = useWriteSubmit(
    close,
    t.versions.requestChangesDone,
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t.versions.requestChanges}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.versions.requestChangesTitle(name)}
        description={t.versions.requestChangesDescription}
        closeLabel={t.close}
      >
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const note = String(
              new FormData(event.currentTarget).get("note") ?? "",
            );
            run(() =>
              requestPostVersionChanges({ projectId, versionId, note }),
            );
          }}
        >
          <TextareaField
            name="note"
            label={t.versions.requestChangesNote}
            rows={3}
            maxLength={2000}
          />
          <FormMessage kind="error">{error}</FormMessage>
          <DialogFormActions
            pending={pending}
            submitLabel={t.versions.requestChanges}
            onCancel={close}
          />
        </form>
      </FormDialog>
    </>
  );
}
