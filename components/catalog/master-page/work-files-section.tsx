"use client";

import {
  IconEyeOpen,
  IconLink,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { fileOpenActions } from "@/components/catalog/files/file-open-actions";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import type { MasterSession, WorkItem } from "@/lib/catalog/master/rules";
import { deleteWorkLink } from "@/lib/catalog/master/session-actions";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import { fr } from "@/lib/i18n/fr";
import { workStatusFileTone } from "@/lib/ui/state-tones";

import { WorkFileForm } from "./work-file-form";

type Editing = { mode: "file" | "link"; item: WorkItem | null };

/**
 * « Fichiers de travail » of a title (retours Catalogue 17, 21, 36 à 38),
 * in place of the tracks typed one by one: session folders, ZIP, DAW
 * projects, stems, versioned, stored once (the Files tab shows the same
 * rows), each with its session and state; a link when it exceeds 50 Mo.
 */
export function WorkFilesSection({
  masterId,
  organizationId,
  items,
  sessions,
}: {
  masterId: string;
  // Null: read only (no manage_catalog).
  organizationId: string | null;
  items: WorkItem[];
  sessions: MasterSession[];
}) {
  const t = fr.masterPage.workFiles;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<WorkItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canEdit = organizationId !== null;
  const sessionOf = new Map(sessions.map((s) => [s.id, sessionLabel(s)]));

  const remove = (item: WorkItem) =>
    startTransition(async () => {
      const result =
        item.kind === "link"
          ? await deleteWorkLink(masterId, item.id)
          : await deleteCatalogFile({
              owner: { kind: "master", id: masterId },
              fileId: item.id,
            });
      if (!result.ok) return setError(result.error);
      setError(null);
      setDeleting(null);
      toast.success(t.deleted);
    });

  return (
    <PageSection
      card
      id="work-files"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing({ mode: "link", item: null })}
            >
              {t.addLink}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing({ mode: "file", item: null })}
            >
              {t.add}
            </Button>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyNote>{canEdit ? t.empty : t.emptyReadOnly}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.columns.name}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.session}</DataTableHead>
            <DataTableHead hideBelow="md">{t.columns.status}</DataTableHead>
            <DataTableHead hideBelow="lg" fill>
              {t.columns.added}
            </DataTableHead>
            <DataTableActionsHead label={fr.records.menu.column} />
          </DataTableHeader>
          <DataTableBody>
            {items.map((item) => (
              <DataTableRow key={`${item.kind}-${item.id}`}>
                <DataTableCell>
                  <DataTableMedia
                    title={item.name}
                    subtitle={[
                      item.kind === "link" ? t.link : t.version(item.version),
                      item.description,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  {(item.sessionId && sessionOf.get(item.sessionId)) || (
                    <span className="text-muted-foreground">{t.noSession}</span>
                  )}
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  {item.status ? (
                    <StatusBadge
                      tone={workStatusFileTone[item.status]}
                      size="sm"
                    >
                      {t.statuses[item.status]}
                    </StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">{t.noStatus}</span>
                  )}
                </DataTableCell>
                <DataTableCell hideBelow="lg" fill>
                  <span className="text-muted-foreground">
                    <Timestamp iso={item.createdAt} show="day" />{" "}
                    {t.addedBy(item.authorName)}
                  </span>
                </DataTableCell>
                <DataTableActionsCell>
                  <RowActions
                    label={fr.records.menu.label(item.name)}
                    actions={[
                      ...(item.kind === "link" && item.url
                        ? [
                            {
                              key: "open",
                              label: fr.catalogFiles.menu.open,
                              icon: IconEyeOpen,
                              onSelect: () =>
                                window.open(item.url!, "_blank", "noopener"),
                            },
                          ]
                        : fileOpenActions(item)),
                      ...(canEdit
                        ? [
                            {
                              key: "edit",
                              label: fr.records.menu.edit,
                              icon:
                                item.kind === "link"
                                  ? IconLink
                                  : IconPenWriting2,
                              onSelect: () =>
                                setEditing({ mode: item.kind, item }),
                            },
                            {
                              key: "delete",
                              label: fr.masterPage.remove.confirm,
                              icon: IconTrash,
                              onSelect: () => setDeleting(item),
                            },
                          ]
                        : []),
                    ]}
                  />
                </DataTableActionsCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
      {canEdit && (
        <p className="text-caption text-muted-foreground">{t.limit}</p>
      )}

      {organizationId && (
        <FormDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          title={
            editing?.item
              ? t.editTitle
              : editing?.mode === "link"
                ? t.addLinkTitle
                : t.addTitle
          }
          description={t.formDescription}
          closeLabel={fr.masterPage.form.close}
        >
          {editing && (
            <WorkFileForm
              masterId={masterId}
              organizationId={organizationId}
              sessions={sessions}
              mode={editing.mode}
              item={editing.item}
              onDone={() => setEditing(null)}
            />
          )}
        </FormDialog>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && (setDeleting(null), setError(null))}
        title={t.deleteTitle}
        description={deleting ? t.deleteBody(deleting.name) : ""}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={fr.masterPage.remove.confirm}
        pendingLabel={fr.masterPage.remove.deleting}
        pending={pending}
        destructive
        error={error}
        onConfirm={() => deleting && remove(deleting)}
      />
    </PageSection>
  );
}
