"use client";

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import type { MasterSession, MasterTrack } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import {
  AddItemButton,
  DeleteItemDialog,
  ItemRowActions,
  useItemDialogs,
} from "./item-dialogs";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import { TrackForm } from "./track-form";

// Tracks typed one by one before the working files (retour Catalogue 36):
// kept for the history, read only and folded, never offered for new ones.
export function TracksSection({
  masterId,
  tracks,
  sessions,
  canEdit,
}: {
  masterId: string;
  tracks: MasterTrack[];
  sessions: MasterSession[];
  canEdit: boolean;
}) {
  const legacy = fr.masterPage.workFiles;
  const t = fr.masterPage.tracks;
  const dialogs = useItemDialogs<MasterTrack>();
  const sessionsById = new Map(sessions.map((s) => [s.id, sessionLabel(s)]));

  return (
    <PageSection
      card
      id="tracks"
      title={legacy.legacyTitle}
      description={legacy.legacyDescription}
      collapsible
      defaultOpen={false}
      action={canEdit && <AddItemButton label={t.add} onClick={dialogs.add} />}
    >
      {tracks.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.columns.name}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.performer}</DataTableHead>
            <DataTableHead hideBelow="md" fill>
              {t.columns.session}
            </DataTableHead>
            {canEdit && <DataTableActionsHead label={t.columns.actions} />}
          </DataTableHeader>
          <DataTableBody>
            {tracks.map((track) => (
              <DataTableRow key={track.id}>
                <DataTableCell>{track.name}</DataTableCell>
                <DataTableCell hideBelow="sm">
                  {track.performer ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="md" fill>
                  {(track.sessionId && sessionsById.get(track.sessionId)) || (
                    <span className="text-muted-foreground">{t.noSession}</span>
                  )}
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    <ItemRowActions
                      name={track.name}
                      onEdit={() => dialogs.edit(track)}
                      onDelete={() => dialogs.remove(track)}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      <FormDialog
        open={dialogs.editing !== null}
        onOpenChange={(open) => !open && dialogs.closeForm()}
        title={dialogs.editing?.item ? t.editTitle : t.addTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <TrackForm
          masterId={masterId}
          track={dialogs.editing?.item ?? null}
          sessions={sessions}
          onDone={dialogs.closeForm}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="track"
        item={
          dialogs.deleting
            ? { id: dialogs.deleting.id, name: dialogs.deleting.name }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={dialogs.closeDelete}
      />
    </PageSection>
  );
}
