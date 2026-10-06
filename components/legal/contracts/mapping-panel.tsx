"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AgreementList } from "@/components/legal/contracts/agreement-list";
import { MappingForm } from "@/components/legal/contracts/mapping-form";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { formatDate } from "@/lib/release/format";

/** The mapping to approve, or approved (with « Modifier la cartographie »). */
export function MappingPanel({
  projectId,
  rows,
  approval,
}: {
  projectId: string;
  rows: AgreementRow[];
  approval: { by: string; at: string } | null;
}) {
  const t = fr.legalContracts.agreements;
  const router = useRouter();
  const [editing, setEditing] = useState(approval === null);

  if (editing)
    return (
      <MappingForm
        projectId={projectId}
        rows={rows}
        onCancel={approval ? () => setEditing(false) : undefined}
        onDone={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  return (
    <div className="flex flex-col gap-4">
      {approval && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {t.mappingApproved(approval.by, formatDate(approval.at))}
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
