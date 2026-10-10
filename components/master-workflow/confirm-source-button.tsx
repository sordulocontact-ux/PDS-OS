"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
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
 * (or the current source when changing). A version not listed yet is
 * imported from the modal (the title's own audio import, manage_catalog),
 * then chosen. Saved, the page refreshes and the row reads "Source confirmée".
 */
export function ConfirmSourceButton({
  action,
  organizationId,
}: {
  action: Action;
  // Where an imported version is stored; null without manage_catalog.
  organizationId: string | null;
}) {
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
        <SourceForm
          action={action}
          organizationId={organizationId}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

// Mounted at each opening (FormDialog): the choice starts over each time.
function SourceForm({
  action,
  organizationId,
  onDone,
}: {
  action: Action;
  organizationId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const t = fr.masterWorkflow.inventory.source;
  const [fileId, setFileId] = useState(
    action.currentFileId ?? action.detectedFileId,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A version imported here comes back with the refreshed options: it is
  // the one the person meant, so it is chosen.
  const known = useRef(new Set(action.options.map((option) => option.fileId)));
  useEffect(() => {
    const added = action.options.find(
      (option) => !known.current.has(option.fileId),
    );
    for (const option of action.options) known.current.add(option.fileId);
    if (added) setFileId(added.fileId);
  }, [action.options]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // The import's own form (in a portal) bubbles here through React.
    if (event.target !== event.currentTarget) return;
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
        required
        disabled={pending}
        choices={action.options.map((option) => ({
          value: option.fileId,
          label: option.label,
          hint: option.hint,
        }))}
        value={fileId}
        onChange={setFileId}
      />
      {organizationId && action.importState && (
        <FileImport
          organizationId={organizationId}
          owner={{ kind: "master", id: action.masterId }}
          audio={{ defaultState: action.importState }}
          onAdded={() => router.refresh()}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{t.notListed}</span>
            <FileImportButton compact label={t.importVersion} />
          </div>
        </FileImport>
      )}
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
