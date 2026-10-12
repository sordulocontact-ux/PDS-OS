"use client";

import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  SPLIT_KINDS,
  formatShare,
  splitTotal,
  type MasterSplit,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import type { SplitEvent } from "@/lib/catalog/master/split-queries";
import {
  splitReviewState,
  type SplitGap,
  type SplitValidation,
} from "@/lib/catalog/master/split-review";
import type { ConfirmedSplit } from "@/lib/legal/splits/title-split";
import { splitStatusTone } from "@/lib/ui/state-tones";

import {
  AddItemButton,
  DeleteItemDialog,
  useItemDialogs,
} from "./item-dialogs";
import { ConfirmedSplitNote } from "./confirmed-split-note";
import { SplitReviewBar } from "./split-review-bar";
import {
  SplitGapsNote,
  SplitHistory,
  SplitValidationNote,
} from "./split-review-notes";
import { SplitForm } from "./split-form";
import { SplitsTable } from "./splits-table";

// Shares of the master and of the publishing, one section each, never
// sharing a total: total and remainder computed by code (splitTotal), never
// above 100 % (SQL); « Complet » is the arithmetic, the validation is apart
// (retours Catalogue 40, 44 à 53): its state, the validated version when the
// lines changed since, the gaps with the credits, every change.
export function SplitsSection({
  masterId,
  splits,
  canEdit,
  confirmed = null,
  validations = {},
  events = [],
  gaps = [],
  canValidate = false,
}: {
  masterId: string;
  splits: MasterSplit[];
  canEdit: boolean;
  // The Juridique's confirmed publishing split, when there is one.
  confirmed?: ConfirmedSplit | null;
  validations?: Partial<Record<SplitKind, SplitValidation>>;
  events?: SplitEvent[];
  gaps?: SplitGap[];
  // The legal side (manage_legal) validates a complete split.
  canValidate?: boolean;
}) {
  const t = fr.masterPage.splits;
  const dialogs = useItemDialogs<MasterSplit>();
  const [addKind, setAddKind] = useState<SplitKind>("master");
  const editing = dialogs.editing?.item ?? null;
  const formKind = editing?.kind ?? addKind;
  const available =
    splitTotal(splits, formKind).remaining +
    (editing?.kind === formKind ? editing.share : 0);

  return (
    <>
      {SPLIT_KINDS.map((kind) => {
        const rows = splits.filter((s) => s.kind === kind);
        const total = splitTotal(splits, kind);
        const validation = validations[kind] ?? null;
        const review = splitReviewState(splits, kind, validation);
        return (
          <PageSection
            card
            key={kind}
            id={`splits-${kind}`}
            title={t.kinds[kind]}
            description={t.kindDescriptions[kind]}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={splitStatusTone[total.status]}>
                  {total.status === "incomplete"
                    ? t.status.incomplete(formatShare(total.remaining))
                    : t.status[total.status]}
                </StatusBadge>
                <SplitReviewBar
                  masterId={masterId}
                  kind={kind}
                  state={review}
                  complete={total.status === "complete"}
                  canValidate={canValidate}
                />
                {canEdit && total.status !== "complete" && (
                  <AddItemButton
                    label={t.add}
                    onClick={() => {
                      setAddKind(kind);
                      dialogs.add();
                    }}
                  />
                )}
              </div>
            }
          >
            <SplitValidationNote state={review} validation={validation} />
            {kind === "publishing" && <SplitGapsNote gaps={gaps} />}
            {kind === "publishing" && confirmed && (
              <ConfirmedSplitNote
                masterId={masterId}
                confirmed={confirmed}
                current={rows}
                canEdit={canEdit}
              />
            )}
            {rows.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <SplitsTable
                rows={rows}
                canEdit={canEdit}
                onEdit={dialogs.edit}
                onDelete={dialogs.remove}
              />
            )}
            <p className="text-sm text-muted-foreground tabular-nums">
              {t.total(formatShare(total.total))}
            </p>
            <SplitHistory events={events.filter((e) => e.kind === kind)} />
          </PageSection>
        );
      })}

      <FormDialog
        open={dialogs.editing !== null}
        onOpenChange={(open) => !open && dialogs.closeForm()}
        title={editing ? t.editTitle : t.addTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <SplitForm
          masterId={masterId}
          split={editing}
          kind={formKind}
          available={available}
          onDone={dialogs.closeForm}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="split"
        item={
          dialogs.deleting
            ? { id: dialogs.deleting.id, name: dialogs.deleting.party }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={dialogs.closeDelete}
      />
    </>
  );
}
