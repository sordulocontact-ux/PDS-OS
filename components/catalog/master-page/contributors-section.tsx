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
import type { MasterContributor } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { ContributorForm } from "./contributor-form";
import {
  AddItemButton,
  DeleteItemDialog,
  ItemRowActions,
  useItemDialogs,
} from "./item-dialogs";

// Every credit that is not a performing artist, grouped by role order.
export function ContributorsSection({
  masterId,
  contributors,
  canEdit,
}: {
  masterId: string;
  contributors: MasterContributor[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.credits;
  const dialogs = useItemDialogs<MasterContributor>();

  return (
    <PageSection
      card
      id="contributors"
      title={t.title}
      description={t.description}
      action={canEdit && <AddItemButton label={t.add} onClick={dialogs.add} />}
    >
      {contributors.length === 0 ? (
        <EmptyNote>{canEdit ? t.emptyBody : t.emptyBodyReadOnly}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.columns.name}</DataTableHead>
            <DataTableHead>{t.columns.role}</DataTableHead>
            <DataTableHead hideBelow="sm" fill>
              {t.columns.detail}
            </DataTableHead>
            {canEdit && <DataTableActionsHead label={t.columns.actions} />}
          </DataTableHeader>
          <DataTableBody>
            {contributors.map((contributor) => (
              <DataTableRow key={contributor.id}>
                <DataTableCell>{contributor.name}</DataTableCell>
                <DataTableCell>{t.roles[contributor.role]}</DataTableCell>
                <DataTableCell hideBelow="sm" fill>
                  {contributor.detail ?? EMPTY_CELL}
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    <ItemRowActions
                      name={contributor.name}
                      onEdit={() => dialogs.edit(contributor)}
                      onDelete={() => dialogs.remove(contributor)}
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
        <ContributorForm
          masterId={masterId}
          contributor={dialogs.editing?.item ?? null}
          onDone={dialogs.closeForm}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="contributor"
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
