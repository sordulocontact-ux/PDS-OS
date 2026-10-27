"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { fileOpenActions } from "@/components/catalog/files/file-open-actions";
import { AudioReclassifyForm } from "@/components/catalog/master-page/audio/audio-reclassify-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import {
  audioDeleteBlock,
  canReclassify,
  type NumberedVersion,
} from "@/lib/catalog/audio-versions";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { dialogs, catalogFiles, masterPage };

/**
 * « ⋯ » of an audio version: open, download, then for whoever writes the
 * title « Corriger l'étape » (while nobody examined nor used it) and
 * « Supprimer » — confirmed with its impact, or explained when the version
 * is validated or used by a project (retour Catalogue 24).
 */
export function AudioVersionMenu({
  masterId,
  version,
  label,
  canEdit,
}: {
  masterId: string;
  version: NumberedVersion;
  label: string;
  canEdit: boolean;
}) {
  const t = fr.masterPage.audio.versions;
  const [reclassifying, setReclassifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = audioDeleteBlock(version);

  function closeDelete() {
    setError(null);
    setDeleting(false);
  }

  const actions: RowAction[] = [
    ...fileOpenActions(version),
    ...(canEdit && canReclassify(version)
      ? [
          {
            key: "reclassify",
            label: t.reclassify,
            icon: IconPenWriting2,
            onSelect: () => setReclassifying(true),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            key: "delete",
            label: t.delete,
            icon: IconTrash,
            onSelect: () => setDeleting(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <RowActions
        label={fr.catalogFiles.menu.label(version.fileName)}
        actions={actions}
      />
      {canEdit && (
        <>
          <FormDialog
            open={reclassifying}
            onOpenChange={setReclassifying}
            title={t.reclassifyTitle(label)}
            description={t.reclassifyHint}
            closeLabel={fr.dialogs.close}
          >
            <AudioReclassifyForm
              masterId={masterId}
              fileId={version.id}
              state={version.audioState}
              onDone={() => setReclassifying(false)}
            />
          </FormDialog>
          <ConfirmDialog
            open={deleting}
            onOpenChange={(open) => !open && closeDelete()}
            title={t.deleteTitle(label)}
            description={
              blocked ? t.deleteBlocked[blocked] : t.deleteBody(label)
            }
            cancelLabel={fr.dialogs.cancel}
            closeLabel={fr.dialogs.close}
            confirmLabel={t.delete}
            pendingLabel={fr.catalogFiles.deleting}
            pending={pending}
            destructive
            error={error}
            onConfirm={
              blocked
                ? undefined
                : () =>
                    startTransition(async () => {
                      const result = await deleteCatalogFile({
                        owner: { kind: "master", id: masterId },
                        fileId: version.id,
                      });
                      if (result.ok) closeDelete();
                      else setError(result.error);
                    })
            }
          />
        </>
      )}
    </>
  );
}
