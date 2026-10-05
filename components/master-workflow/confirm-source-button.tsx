"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { confirmMasterSource } from "@/lib/master-workflow/actions";
import type { MasterFactAction } from "@/lib/master-workflow/types";

type Action = Extract<MasterFactAction, { kind: "confirm_source" }>;

/**
 * "Confirmer" / "Changer" the mix's source of a title (the project's owner):
 * the title's audio versions in the modal, the detected one chosen first
 * (or the current source when changing). Saved, the page refreshes and the
 * row reads "Source confirmée".
 */
export function ConfirmSourceButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const t = fr.masterWorkflow.inventory.source;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        // Above the row's stretched link.
        className="relative z-10"
        onClick={() => setOpen(true)}
      >
        {action.currentFileId ? t.change : t.confirm}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle(action.title)}
        description={t.dialogDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <SourceForm action={action} onDone={() => setOpen(false)} />
      </FormDialog>
    </>
  );
}

// Mounted at each opening (FormDialog): the choice starts over each time.
function SourceForm({
  action,
  onDone,
}: {
  action: Action;
  onDone: () => void;
}) {
  const router = useRouter();
  const t = fr.masterWorkflow.inventory.source;
  const [fileId, setFileId] = useState(
    action.currentFileId ?? action.detectedFileId,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await confirmMasterSource({
        projectId: action.projectId,
        masterId: action.masterId,
        fileId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <ChoiceCards
        name="fileId"
        legend={t.legend}
        disabled={pending}
        choices={action.options.map((option) => ({
          value: option.fileId,
          label: option.label,
          hint: option.hint,
        }))}
        value={fileId}
        onChange={setFileId}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
