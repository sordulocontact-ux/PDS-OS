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
import {
  groupContributors,
  type ContributorGroup,
} from "@/lib/catalog/master/contributor-groups";
import type { MasterContributor } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { ContributorForm } from "./contributor-form";
import {
  AddItemButton,
  DeleteItemDialog,
  ItemRowActions,
  useItemDialogs,
} from "./item-dialogs";

// Every credit that is not a performing artist: one line per person with
// all their roles (UX test of 09/10/2026), in the order of their first role.
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
  const dialogs = useItemDialogs<ContributorGroup>();
  const people = groupContributors(contributors);

  return (
    <PageSection
      card
      id="contributors"
      title={t.title}
      description={t.description}
      action={canEdit && <AddItemButton label={t.add} onClick={dialogs.add} />}
    >
      {people.length === 0 ? (
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
            {people.map((contributor) => (
              <DataTableRow key={contributor.key}>
                <DataTableCell>{contributor.name}</DataTableCell>
                <DataTableCell>
                  {contributor.roles.map((role) => t.roles[role]).join(", ")}
                </DataTableCell>
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
            ? {
                id: dialogs.deleting.itemIds[0],
                name: dialogs.deleting.name,
                alsoIds: dialogs.deleting.itemIds.slice(1),
              }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={dialogs.closeDelete}
      />
    </PageSection>
  );
}
