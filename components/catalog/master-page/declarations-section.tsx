"use client";

import { useState } from "react";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/ui/status-badge";
import type { DeclarationEvent } from "@/lib/catalog/master/queries";
import {
  ORGANISMS,
  declarationVerified,
  type MasterDeclaration,
  type Organism,
} from "@/lib/catalog/master/rules";
import { Timestamp } from "@/components/ui/timestamp";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatShortDate } from "@/lib/release/format";
import { declarationStatusTone } from "@/lib/ui/state-tones";

import { DeclarationForm } from "./declaration-form";
import { DeleteItemDialog, ItemRowActions } from "./item-dialogs";

const fr = { masterPage };

const t0 = fr.masterPage.declarations;
// A recorded value as people read it: a status by its label, a proof as
// attached or not, an empty value as « — ».
function shown(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return t0.empty;
  if (field === "status")
    return t0.statuses[value as keyof typeof t0.statuses] ?? String(value);
  if (field === "proof_file_id") return t0.proof;
  if (field === "declared_on") return formatShortDate(String(value));
  return String(value);
}

// One row per collecting society: « À vérifier » until it is qualified,
// then its status (final list, retour 63), who follows it, its reference
// and date, whether its confirmation is verified by a proof; below, the
// history of every change (retour 62).
export function DeclarationsSection({
  masterId,
  declarations,
  history,
  canEdit,
}: {
  masterId: string;
  declarations: MasterDeclaration[];
  history: DeclarationEvent[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.declarations;
  const byOrganism = new Map(declarations.map((d) => [d.organism, d]));
  const [editing, setEditing] = useState<Organism | null>(null);
  const [deleting, setDeleting] = useState<MasterDeclaration | null>(null);

  return (
    <PageSection
      card
      id="declarations"
      title={t.title}
      description={t.description}
    >
      <DataTable>
        <DataTableHeader>
          <DataTableHead>{t.columns.organism}</DataTableHead>
          <DataTableHead>{t.columns.status}</DataTableHead>
          <DataTableHead hideBelow="md">{t.columns.reference}</DataTableHead>
          <DataTableHead hideBelow="sm" fill>
            {t.columns.date}
          </DataTableHead>
          {canEdit && <DataTableActionsHead label={t.columns.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {ORGANISMS.map((organism) => {
            const declaration = byOrganism.get(organism);
            const status = declaration?.status ?? "to_verify";
            return (
              <DataTableRow key={organism}>
                <DataTableCell>
                  <DataTableMedia
                    title={t.organisms[organism]}
                    subtitle={t.organismDescriptions[organism]}
                  />
                </DataTableCell>
                <DataTableCell>
                  <span className="flex flex-col items-start gap-1">
                    <StatusBadge tone={declarationStatusTone[status]}>
                      {t.statuses[status]}
                    </StatusBadge>
                    {declaration?.status === "confirmed" && (
                      <span className="text-caption text-muted-foreground">
                        {declarationVerified(declaration)
                          ? t.verified
                          : t.declaredOnly}
                      </span>
                    )}
                    {declaration?.thirdParty && (
                      <span className="text-caption text-muted-foreground">
                        {t.followedBy(declaration.thirdParty)}
                      </span>
                    )}
                  </span>
                </DataTableCell>
                <DataTableCell hideBelow="md" className="font-mono">
                  {declaration?.reference ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="sm" fill>
                  {declaration?.date
                    ? formatShortDate(declaration.date)
                    : EMPTY_CELL}
                </DataTableCell>
                {canEdit && (
                  <DataTableActionsCell>
                    {declaration ? (
                      <ItemRowActions
                        name={t.organisms[organism]}
                        onEdit={() => setEditing(organism)}
                        onDelete={() => setDeleting(declaration)}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setEditing(organism)}
                      >
                        {t.declare}
                      </Button>
                    )}
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t.history} ({history.length})
        </summary>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t.historyEmpty}</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-2">
            {history.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 text-sm">
                <span className="text-muted-foreground">
                  <Timestamp iso={e.at} /> · {t.organisms[e.organism]}
                  {e.by ? ` · ${e.by}` : ""}
                </span>
                {Object.entries(e.changes).map(([field, [before, after]]) => (
                  <span key={field}>
                    {t.historyLine(
                      t.historyFields[field] ?? field,
                      shown(field, before),
                      shown(field, after),
                    )}
                  </span>
                ))}
              </li>
            ))}
          </ol>
        )}
      </details>

      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? t.dialogTitle(t.organisms[editing]) : ""}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        {editing && (
          <DeclarationForm
            masterId={masterId}
            organism={editing}
            declaration={byOrganism.get(editing) ?? null}
            onDone={() => setEditing(null)}
          />
        )}
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="declaration"
        item={
          deleting
            ? { id: deleting.id, name: t.organisms[deleting.organism] }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={() => setDeleting(null)}
      />
    </PageSection>
  );
}
