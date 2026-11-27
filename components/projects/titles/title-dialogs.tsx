"use client";

import {
  AttachCatalogTitleForm,
  AddParticipationForm,
  RenameTitleForm,
  type ArtistChoices,
} from "@/components/projects/titles/title-forms";
import type { Credit } from "@/components/projects/titles/board-rows";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { abandonProjectTitle } from "@/lib/projects/title-actions";
import type { RecapTitle } from "@/lib/projects/recap-rules";

const fr = { dialogs, projectTitles };

/** A title's gesture that asks something, in its modal. */
export type TitleDialog = "add" | "rename" | "name" | "abandon" | "attach";

/** The title's dialogs, once per title: add an artist, rename, name
 * (« Nommer », in its own words, with « Rattacher un titre du Catalogue »
 * under the field), attach, abandon. */
export function TitleDialogs({
  projectId,
  title,
  label,
  artists,
  invitedOn,
  masterOptions,
  canManage,
  credit,
  dialog,
  onDialog,
}: {
  projectId: string;
  title: RecapTitle;
  label: string;
  artists: ArtistChoices;
  invitedOn: Record<string, string[]>;
  masterOptions: Record<string, string>;
  canManage: boolean;
  credit: Credit;
  dialog: TitleDialog | null;
  onDialog: (dialog: TitleDialog | null) => void;
}) {
  const t = fr.projectTitles;
  if (!canManage) return null;
  const close = () => onDialog(null);
  const provisional = title.master?.provisional
    ? t.rename.descriptionProvisional
    : undefined;

  return (
    <>
      <FormDialog
        open={dialog === "add"}
        onOpenChange={(next) => !next && close()}
        title={t.participations.add.title(label)}
        description={t.participations.add.description(
          credit.mode,
          credit.shared,
        )}
        closeLabel={fr.dialogs.close}
      >
        <AddParticipationForm
          projectId={projectId}
          title={title}
          artists={artists}
          invitedOn={invitedOn}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "rename"}
        onOpenChange={(next) => !next && close()}
        title={t.rename.title}
        description={provisional}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm projectId={projectId} title={title} onDone={close} />
      </FormDialog>
      <FormDialog
        open={dialog === "name"}
        onOpenChange={(next) => !next && close()}
        title={t.recap.name.title(label)}
        description={provisional}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm
          projectId={projectId}
          title={title}
          submitLabel={t.recap.name.submit}
          doneMessage={t.recap.name.done}
          onAttach={
            !title.master && Object.keys(masterOptions).length > 0
              ? () => onDialog("attach")
              : undefined
          }
          onDone={close}
        />
      </FormDialog>
      {!title.master && (
        <FormDialog
          open={dialog === "attach"}
          onOpenChange={(next) => !next && close()}
          title={t.catalogAttach.title(label)}
          closeLabel={fr.dialogs.close}
        >
          <AttachCatalogTitleForm
            projectId={projectId}
            titleId={title.id}
            masterOptions={masterOptions}
            onDone={close}
          />
        </FormDialog>
      )}
      <FormDialog
        open={dialog === "abandon"}
        onOpenChange={(next) => !next && close()}
        title={t.abandon.title(label)}
        // Only a maquette in draft or in development becomes
        // « abandonnée »; a validated one keeps its status (décision 8).
        description={
          title.master?.demoStatus === "draft" ||
          title.master?.demoStatus === "developing"
            ? t.abandon.demoNote
            : undefined
        }
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.abandon.reason}
          submitLabel={t.abandon.submit}
          doneMessage={t.abandon.done}
          run={(reason) =>
            abandonProjectTitle({ projectId, titleId: title.id, reason })
          }
          onDone={close}
        />
      </FormDialog>
    </>
  );
}
