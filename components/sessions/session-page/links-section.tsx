"use client";

import { IconLink, IconPlus, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { DialogButton } from "@/components/ui/dialog-button";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { records } from "@/lib/i18n/fr/records";
import { sessions } from "@/lib/i18n/fr/sessions";
import { addSessionLink, deleteSessionLink } from "@/lib/sessions/actions";
import type { SessionLink } from "@/lib/sessions/types";

const fr = { masterPage, records, sessions };

// « drive.google.com », what a link points to, under its name.
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * « Rushs et fichiers » (Ibé, 05/11/2026): the rushes and big files stay on
 * the label's Google Drive; the session keeps a link to each, never a copy.
 */
export function LinksSection({
  sessionId,
  links,
  canEdit,
}: {
  sessionId: string;
  links: SessionLink[];
  canEdit: boolean;
}) {
  const t = fr.sessions.links;
  const [removing, setRemoving] = useState<SessionLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <PageSection
      card
      id="rushs"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <DialogButton
            label={t.add}
            icon={IconPlus}
            variant="outline"
            size="sm"
            title={t.addTitle}
            description={t.description}
          >
            {(close) => (
              <MasterForm
                action={addSessionLink}
                hidden={{ sessionId }}
                onDone={() => {
                  close();
                  toast.success(t.added);
                }}
              >
                {({ value, error: fieldError }) => (
                  <>
                    <Field
                      name="label"
                      label={t.label}
                      required
                      autoComplete="off"
                      maxLength={200}
                      placeholder={t.labelPlaceholder}
                      defaultValue={value("label", "")}
                      error={fieldError("label")}
                    />
                    <Field
                      name="url"
                      type="url"
                      inputMode="url"
                      label={t.url}
                      required
                      autoComplete="off"
                      hint={t.urlHint}
                      defaultValue={value("url", "")}
                      error={fieldError("url")}
                    />
                  </>
                )}
              </MasterForm>
            )}
          </DialogButton>
        )
      }
    >
      {links.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead fill>{t.column}</DataTableHead>
            {canEdit && <DataTableActionsHead label={fr.records.menu.column} />}
          </DataTableHeader>
          <DataTableBody>
            {links.map((link) => (
              <DataTableRow key={link.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    visual={
                      <IconLink
                        aria-hidden
                        className="size-5 text-[color:var(--text-secondary)]"
                      />
                    }
                    title={
                      <DataTableLink href={link.url} newTab>
                        {link.label}
                      </DataTableLink>
                    }
                    subtitle={hostOf(link.url)}
                  />
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    <RowActions
                      reveal
                      label={fr.records.menu.label(link.label)}
                      actions={[
                        {
                          key: "delete",
                          label: t.delete,
                          icon: IconTrash,
                          onSelect: () => setRemoving(link),
                        },
                      ]}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
            setError(null);
          }
        }}
        title={t.deleteTitle}
        description={t.deleteBody}
        cancelLabel={fr.masterPage.form.cancel}
        closeLabel={fr.sessions.page.close}
        confirmLabel={t.delete}
        destructive
        pending={pending}
        error={error}
        onConfirm={() =>
          removing &&
          startTransition(async () => {
            const result = await deleteSessionLink(sessionId, removing.id);
            if (!result.ok) return setError(result.error);
            setRemoving(null);
            toast.success(t.deleted);
          })
        }
      />
    </PageSection>
  );
}
