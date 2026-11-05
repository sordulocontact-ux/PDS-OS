"use client";

import { IconMinus, IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableActionsCell,
  DataTableBody,
  DataTableCell,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { demos } from "@/lib/i18n/fr/demos";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { records } from "@/lib/i18n/fr/records";
import { sessions } from "@/lib/i18n/fr/sessions";
import { detachSessionTitle } from "@/lib/sessions/actions";
import {
  attachSessionTitleForm,
  createSessionDemo,
  loadAttachableTitles,
} from "@/lib/sessions/demo-actions";
import { loadSessionFormData } from "@/lib/sessions/form-data";
import type { SessionTitle, StudioSession } from "@/lib/sessions/types";
import { demoStatusTone } from "@/lib/ui/state-tones";

const fr = { demos, masterPage, records, sessions };

/**
 * « Maquettes et titres »: the songs worked on in the session. A maquette
 * made there is created here (it enters the Catalogue's Maquettes, credited
 * to the session's artist); an existing title or maquette is tied to it.
 * Detached, a title stays in the Catalogue.
 */
export function TitlesSection({
  session,
  canEdit,
}: {
  session: StudioSession;
  canEdit: boolean;
}) {
  const t = fr.sessions.titles;
  const [detaching, setDetaching] = useState<SessionTitle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <PageSection
      card
      id="maquettes"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <div className="flex flex-wrap gap-2">
            <LoadedFormButton
              label={t.attach}
              size="sm"
              variant="outline"
              title={t.attachTitle}
              description={t.description}
              closeLabel={fr.sessions.page.close}
              load={() => loadAttachableTitles(session.id)}
            >
              {(items, close) => (
                <MasterForm
                  action={attachSessionTitleForm}
                  hidden={{ sessionId: session.id }}
                  onDone={close}
                >
                  {({ error: fieldError }) =>
                    Object.keys(items).length === 0 ? (
                      <EmptyNote>{t.attachNone}</EmptyNote>
                    ) : (
                      <OptionSelect
                        name="masterId"
                        label={t.attachLabel}
                        placeholder={t.attachPlaceholder}
                        required
                        items={items}
                        error={fieldError("masterId")}
                      />
                    )
                  }
                </MasterForm>
              )}
            </LoadedFormButton>
            <LoadedFormButton
              label={t.newDemo}
              icon={IconPlus}
              size="sm"
              variant="outline"
              title={t.newDemoTitle}
              description={t.newDemoDescription}
              closeLabel={fr.sessions.page.close}
              load={loadSessionFormData}
            >
              {(data, close) => (
                <MasterForm
                  action={createSessionDemo}
                  hidden={{ sessionId: session.id }}
                  onDone={close}
                >
                  {({ value, error: fieldError }) => (
                    <>
                      <Field
                        name="title"
                        label={t.demoName}
                        required
                        autoComplete="off"
                        maxLength={200}
                        defaultValue={value("title", "")}
                        error={fieldError("title")}
                      />
                      <OptionSelect
                        name="artistId"
                        label={t.demoArtist}
                        required
                        items={data.artists}
                        defaultValue={value(
                          "artistId",
                          session.artists[0]?.id ?? "",
                        )}
                        error={fieldError("artistId")}
                      />
                    </>
                  )}
                </MasterForm>
              )}
            </LoadedFormButton>
          </div>
        )
      }
    >
      {session.titles.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableBody>
            {session.titles.map((title) => (
              <DataTableRow key={title.id}>
                <DataTableCell fill>
                  <DataTableLink href={routes.master(title.id)}>
                    {title.title}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge
                    size="sm"
                    tone={
                      title.demoStatus
                        ? demoStatusTone[title.demoStatus]
                        : "info"
                    }
                  >
                    {title.demoStatus
                      ? fr.demos.badge(fr.demos.statuses[title.demoStatus])
                      : t.master}
                  </StatusBadge>
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    <RowActions
                      reveal
                      label={fr.records.menu.label(title.title)}
                      actions={[
                        {
                          key: "detach",
                          label: t.detach,
                          icon: IconMinus,
                          onSelect: () => setDetaching(title),
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
        open={detaching !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetaching(null);
            setError(null);
          }
        }}
        title={t.detach}
        description={detaching?.title ?? ""}
        cancelLabel={fr.masterPage.form.cancel}
        closeLabel={fr.sessions.page.close}
        confirmLabel={t.detach}
        pending={pending}
        error={error}
        onConfirm={() =>
          detaching &&
          startTransition(async () => {
            const result = await detachSessionTitle(session.id, detaching.id);
            if (!result.ok) return setError(result.error);
            setDetaching(null);
            toast.success(t.detached);
          })
        }
      />
    </PageSection>
  );
}
