"use client";

import { useState } from "react";

import { AgreementList } from "@/components/legal/contracts/agreement-list";
import { MappingForm } from "@/components/legal/contracts/mapping-form";
import type { RequestState } from "@/components/legal/contracts/mapping-row";
import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { legalContracts };

/**
 * « Contrats à prévoir » (proto « Projet complet »): the form while a
 * person with a contact has no decision, else what was confirmed, by whom
 * and when, and « Modifier les contrats à prévoir ».
 */
export function MappingPanel({
  projectId,
  rows,
  approval,
  organizationId,
  requests,
  direction,
}: {
  projectId: string;
  rows: AgreementRow[];
  approval: { by: string; at: string } | null;
  organizationId: string | null;
  requests: Record<string, RequestState>;
  direction: string;
}) {
  const t = fr.legalContracts.agreements;
  const undecided = rows.some(
    (r) => r.contactId && !r.contract && r.state === "unmapped",
  );
  const [editing, setEditing] = useState(approval === null || undecided);

  if (editing)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.plan.intro}
        </p>
        <MappingForm
          projectId={projectId}
          rows={rows}
          organizationId={organizationId}
          requests={requests}
          direction={direction}
          onCancel={
            approval && !undecided ? () => setEditing(false) : undefined
          }
          onDone={() => {
            setEditing(false);
          }}
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {approval && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.plan.confirmedBy(approval.by, formatShortInstant(approval.at))}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {t.editMapping}
          </Button>
        </div>
      )}
      <AgreementList projectId={projectId} rows={rows} />
    </div>
  );
}
