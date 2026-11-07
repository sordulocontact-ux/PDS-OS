"use client";

import { IconPenWriting2, IconTrash, IconMinus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

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
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MasterSession } from "@/lib/catalog/master/rules";
import {
  deleteSession,
  detachSession,
} from "@/lib/catalog/master/session-actions";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import { framing } from "@/lib/i18n/fr/framing";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { records } from "@/lib/i18n/fr/records";
import { sessions as sessionsText } from "@/lib/i18n/fr/sessions";
import { formatShortDate } from "@/lib/release/format";
import { sessionHref } from "@/lib/sessions/door";
import { sessionStateTone } from "@/lib/ui/state-tones";

import { AttachSessionButton } from "./attach-session-button";
import { AddItemButton } from "./item-dialogs";
import { SessionForm } from "./session-form";

const fr = { framing, masterPage, records, sessions: sessionsText };

/**
 * Sessions of the title, by date (retours Catalogue 27 à 35): one session
 * may serve several titles, linked rather than copied; its state, its times,
 * the other titles it serves. « Détacher de ce titre » and « Supprimer » are
 * two acts: a session still serving another title is only detached.
 */
export function SessionsSection({
  masterId,
  sessions,
  workCountOf,
  canEdit,
}: {
  masterId: string;
  sessions: MasterSession[];
  // Working files of this title linked to each session.
  workCountOf: Record<string, number>;
  canEdit: boolean;
}) {
  const t = fr.masterPage.sessions;
  const [editing, setEditing] = useState<MasterSession | "new" | null>(null);
  const [detaching, setDetaching] = useState<MasterSession | null>(null);
  const [deleting, setDeleting] = useState<MasterSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const others = (s: MasterSession) =>
    s.titles
      .filter((title) => title.id !== masterId)
      .map((title) => title.title)
      .join(", ");

  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    close: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      setError(null);
      close();
      toast.success(done);
    });

  return (
    <PageSection
      card
      id="sessions"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <div className="flex flex-wrap gap-2">
            <AttachSessionButton masterId={masterId} />
            <AddItemButton label={t.add} onClick={() => setEditing("new")} />
          </div>
        )
      }
    >
      {sessions.length === 0 ? (
        <EmptyNote>{canEdit ? t.emptyBody : t.emptyBodyReadOnly}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{t.fields.kind}</DataTableHead>
            <DataTableHead hideBelow="sm">
              {fr.sessions.columns.state}
            </DataTableHead>
            <DataTableHead hideBelow="md">{t.fields.studio}</DataTableHead>
            <DataTableHead hideBelow="lg" fill>
              {t.fields.engineer}
            </DataTableHead>
            {canEdit && <DataTableActionsHead label={fr.records.menu.column} />}
          </DataTableHeader>
          <DataTableBody>
            {sessions.map((session) => {
              const also = others(session);
              const times = t.times(session.startsAt, session.endsAt);
              return (
                <DataTableRow key={session.id}>
                  <DataTableCell>
                    <DataTableMedia
                      title={
                        // Its own page (Sessions studio): report, maquettes, rushes.
                        <DataTableLink
                          href={sessionHref(
                            { kind: "title", masterId },
                            session.id,
                          )}
                        >
                          {t.kinds[session.kind]}
                        </DataTableLink>
                      }
                      subtitle={[
                        session.date
                          ? formatShortDate(session.date)
                          : t.undated,
                        times,
                        also && t.alsoOn(also),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="sm">
                    <StatusBadge
                      tone={sessionStateTone[session.state]}
                      size="sm"
                    >
                      {fr.sessions.states[session.state]}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {session.studio ?? EMPTY_CELL}
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" fill>
                    {session.engineer ?? EMPTY_CELL}
                  </DataTableCell>
                  {canEdit && (
                    <DataTableActionsCell>
                      <RowActions
                        label={fr.records.menu.label(sessionLabel(session))}
                        actions={[
                          {
                            key: "edit",
                            label: fr.records.menu.edit,
                            icon: IconPenWriting2,
                            onSelect: () => setEditing(session),
                          },
                          ...(also
                            ? [
                                {
                                  key: "detach",
                                  label: t.detach,
                                  icon: IconMinus,
                                  onSelect: () => setDetaching(session),
                                },
                              ]
                            : []),
                          {
                            key: "delete",
                            label: fr.masterPage.remove.confirm,
                            icon: IconTrash,
                            onSelect: () => setDeleting(session),
                          },
                        ]}
                      />
                    </DataTableActionsCell>
                  )}
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing && editing !== "new" ? t.editTitle : t.addTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <SessionForm
          masterId={masterId}
          session={editing && editing !== "new" ? editing : null}
          onDone={() => setEditing(null)}
        />
      </FormDialog>

      <ConfirmDialog
        open={detaching !== null}
        onOpenChange={(open) => !open && (setDetaching(null), setError(null))}
        title={t.detachTitle}
        description={
          detaching
            ? t.detachBody(sessionLabel(detaching), others(detaching))
            : ""
        }
        cancelLabel={fr.framing.actions.cancel}
        closeLabel={fr.masterPage.form.close}
        confirmLabel={t.detach}
        pendingLabel={fr.framing.actions.working}
        pending={pending}
        error={error}
        onConfirm={() =>
          detaching &&
          run(
            () => detachSession(masterId, detaching.id),
            t.detached,
            () => setDetaching(null),
          )
        }
      />

      {/* A shared session is only detached: the dialog says why, no action. */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && (setDeleting(null), setError(null))}
        title={t.confirmTitle}
        description={
          deleting
            ? others(deleting)
              ? t.sharedDelete(others(deleting))
              : t.confirmBody(sessionLabel(deleting)) +
                t.deleteDependencies(workCountOf[deleting.id] ?? 0)
            : ""
        }
        cancelLabel={fr.framing.actions.cancel}
        closeLabel={fr.masterPage.form.close}
        confirmLabel={fr.masterPage.remove.confirm}
        pendingLabel={fr.framing.actions.working}
        pending={pending}
        destructive
        error={error}
        onConfirm={
          deleting && !others(deleting)
            ? () =>
                run(
                  () => deleteSession(masterId, deleting.id),
                  t.deleted,
                  () => setDeleting(null),
                )
            : undefined
        }
      />
    </PageSection>
  );
}
