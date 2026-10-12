"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  formatIswc,
  pLine,
  type MasterRights,
} from "@/lib/catalog/master/rules";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { confirmMasterRights } from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";
import { formatInstant } from "@/lib/utils/instant";

import { RightsForm } from "./rights-form";

// Rights on the master: ISWC of the work, holder and year of the ℗; the
// holder proposed then confirmed by a person, and « à revoir » when the
// master split now proposes someone else (retours 54 and 58).
export function RightsSection({
  masterId,
  rights,
  suggested,
  canEdit,
}: {
  masterId: string;
  rights: MasterRights;
  // Who the master split proposes today.
  suggested: string | null;
  canEdit: boolean;
}) {
  const t = fr.masterPage.rights;
  const [open, setOpen] = useState(false);

  return (
    <PageSection
      card
      id="rights"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <IconPenWriting2 aria-hidden data-icon="inline-start" />
            {t.edit}
          </Button>
        )
      }
    >
      <FactList
        emptyLabel={fr.catalog.notProvided}
        facts={[
          {
            label: t.fields.iswc,
            value: rights.iswc ? formatIswc(rights.iswc) : null,
            valueClassName: "font-mono",
          },
          { label: t.fields.rightsHolder, value: rights.rightsHolder },
          {
            label: t.fields.rightsYear,
            value: rights.rightsYear?.toString() ?? null,
            valueClassName: "tabular-nums",
          },
          { label: t.pLine, value: pLine(rights) },
        ]}
      />
      {rights.rightsHolder && (
        <div className="flex flex-col gap-2 pt-3">
          <p className="text-sm text-muted-foreground">
            {rights.confirmedAt
              ? t.confirmed(
                  formatInstant(rights.confirmedAt),
                  rights.confirmedBy ?? null,
                )
              : t.proposed}
          </p>
          {suggested && suggested !== rights.rightsHolder && (
            <ToneCallout tone="warning">{t.review(suggested)}</ToneCallout>
          )}
          {canEdit && !rights.confirmedAt && (
            <ConfirmButton
              label={t.confirm}
              title={t.confirmTitle}
              body={t.confirmBody}
              confirmLabel={t.confirm}
              pendingLabel={fr.dialogs.saving}
              done={t.confirmDone}
              run={() => confirmMasterRights(masterId)}
            />
          )}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.editTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <RightsForm
          masterId={masterId}
          rights={rights}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </PageSection>
  );
}
