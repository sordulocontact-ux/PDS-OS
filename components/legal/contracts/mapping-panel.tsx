"use client";

import { useState } from "react";

import { AgreementList } from "@/components/legal/contracts/agreement-list";
import { MappingForm } from "@/components/legal/contracts/mapping-form";
import type { RequestState } from "@/components/legal/contracts/mapping-row";
import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

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
      <MappingForm
        projectId={projectId}
        rows={rows}
        organizationId={organizationId}
        requests={requests}
        direction={direction}
        onCancel={approval && !undecided ? () => setEditing(false) : undefined}
        onDone={() => {
          setEditing(false);
        }}
      />
    );
  // Who confirmed and when is in the history, not repeated here (Sacha,
  // 06/11/2026); « Modifier » under the table, where « Confirmer » was.
  return (
    <div className="flex flex-col gap-4">
      <AgreementList projectId={projectId} rows={rows} />
      {approval && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setEditing(true)}
        >
          {t.editMapping}
        </Button>
      )}
    </div>
  );
}
