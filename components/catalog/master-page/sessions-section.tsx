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
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import type { MasterSession } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

import {
  AddItemButton,
  DeleteItemDialog,
  ItemRowActions,
  useItemDialogs,
} from "./item-dialogs";
import { SessionForm } from "./session-form";
import { sessionLabel } from "@/lib/catalog/master/session-label";

// Sessions of the master, by date: type and date, place, engineer, notes.
export function SessionsSection({
  masterId,
  sessions,
  canEdit,
}: {
  masterId: string;
  sessions: MasterSession[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.sessions;
  const dialogs = useItemDialogs<MasterSession>();

  return (
    <PageSection
      card
      id="sessions"
      title={t.title}
      description={t.description}
      action={canEdit && <AddItemButton label={t.add} onClick={dialogs.add} />}
    >
      {sessions.length === 0 ? (
        <EmptyNote>{canEdit ? t.emptyBody : t.emptyBodyReadOnly}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.fields.kind}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.fields.studio}</DataTableHead>
            <DataTableHead hideBelow="md">{t.fields.engineer}</DataTableHead>
            <DataTableHead hideBelow="lg" fill>
              {t.fields.notes}
            </DataTableHead>
            {canEdit && <DataTableActionsHead label={fr.records.menu.column} />}
          </DataTableHeader>
          <DataTableBody>
            {sessions.map((session) => (
              <DataTableRow key={session.id}>
                <DataTableCell>
                  <DataTableMedia
                    title={t.kinds[session.kind]}
                    subtitle={
                      session.date ? formatShortDate(session.date) : t.undated
                    }
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  {session.studio ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  {session.engineer ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="lg" fill>
                  <span className="line-clamp-2 whitespace-pre-line text-muted-foreground">
                    {session.notes ?? EMPTY_CELL}
                  </span>
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    <ItemRowActions
                      name={sessionLabel(session)}
                      onEdit={() => dialogs.edit(session)}
                      onDelete={() => dialogs.remove(session)}
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
        <SessionForm
          masterId={masterId}
          session={dialogs.editing?.item ?? null}
          onDone={dialogs.closeForm}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="session"
        item={
          dialogs.deleting
            ? { id: dialogs.deleting.id, name: sessionLabel(dialogs.deleting) }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={dialogs.closeDelete}
      />
    </PageSection>
  );
}
