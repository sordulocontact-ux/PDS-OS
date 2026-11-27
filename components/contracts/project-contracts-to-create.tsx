"use client";

import { useState, useTransition } from "react";

import { rolesOf } from "@/components/legal/contracts/contract-table";
import { GenerateDialog } from "@/components/legal/contracts/generate-dialog";
import type { RequestState } from "@/components/legal/contracts/mapping-row";
import { NewTemplateDialog } from "@/components/legal/contracts/new-template-dialog";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { approveContractMapping } from "@/lib/legal/contracts/actions";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { loadProjectContracts } from "@/lib/legal/contracts/project-contracts";
import { isAwaitingAgreement } from "@/lib/legal/title-contracts-rules";

const fr = { contracts, legalContracts, legalDocuments };

/** A person who still needs a contract: none made, none existing
 * elsewhere, none decided against — a decision always has its reason
 * (approve_contract_mapping). Not the state « not_needed », which the code
 * also gives to a person nobody decided for once the mapping is confirmed. */
export const toCreate = (row: AgreementRow) =>
  !row.contract && !row.existing && !row.noAgreementReason;

type Shared = {
  projectId: string;
  organizationId: string | null;
  direction: string;
  // Something changed: the rows are read again.
  onChange: () => void;
  // The contract exists: its page opens.
  onCreated: (contractId: string) => void;
};

/**
 * « Partir d'un modèle » in « Nouveau contrat » (Sacha 26/11/2026): only
 * the people of the project who still need a contract, each with its
 * template and « Créer le contrat » — not the Plan d'action's table, which
 * decides the contracts of a project (« Confirmer les contrats nécessaires »,
 * « Pas d'accord nécessaire »), and stays in its Juridique.
 */
export function ProjectContractsToCreate({
  rows,
  requests,
  ...shared
}: Shared & {
  rows: AgreementRow[];
  requests: Record<string, RequestState>;
}) {
  const t = fr.contracts.creation;
  const people = rows.filter(toCreate);
  if (people.length === 0)
    return <p className="text-sm text-muted-foreground">{t.allCreated}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border px-4">
      {people.map((row) => (
        <PersonLine
          key={row.key}
          row={row}
          request={requests[row.key] ?? null}
          {...shared}
        />
      ))}
    </ul>
  );
}

function PersonLine({
  row,
  request,
  projectId,
  organizationId,
  direction,
  onChange,
  onCreated,
}: Shared & { row: AgreementRow; request: RequestState | null }) {
  const t = fr.contracts.creation;
  const p = fr.legalContracts.agreements.plan;
  const [choice, setChoice] = useState<string | null>(
    row.proposal.templateId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  // The template chosen is provided for (the same decision as the Plan
  // d'action's, for this person only); generated at once when every value
  // is there, else its missing values are shown.
  const create = () => {
    if (!choice) return setError(t.chooseTemplate);
    setError(null);
    startTransition(async () => {
      const saved = await approveContractMapping({
        projectId,
        items: [
          {
            key: row.key,
            needed: true,
            templateId: choice,
            feeCents: row.proposal.feeCents,
            reason: null,
          },
        ],
      });
      if (!saved.ok) return setError(saved.error);
      const read = await loadProjectContracts(projectId);
      const after =
        read.state === "ready"
          ? read.rows.find((r) => r.key === row.key)
          : undefined;
      if (after?.contract) return onCreated(after.contract.id);
      toast.info(t.missingAfter(row.name));
      onChange();
    });
  };

  const action = (() => {
    if (!row.contactId)
      return <Note>{fr.legalContracts.agreements.noContact}</Note>;
    if (isAwaitingAgreement(row))
      return <Note>{fr.legalContracts.agreements.awaiting}</Note>;
    // Provided for already: its values, then the contract.
    if (row.needId && row.template)
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {row.template.name}
          </span>
          <GenerateDialog
            projectId={projectId}
            row={row}
            label={t.create}
            size="sm"
          />
        </div>
      );
    if (request?.pending)
      return (
        <Note>
          {fr.legalDocuments.template.pending(request.name, direction)}
        </Note>
      );
    const canAsk = row.compatible.length === 0 && organizationId !== null;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <OptionSelect
              id={`template-${row.key}`}
              name={`template-${row.key}`}
              label={t.templateOf(row.name)}
              hideLabel
              placeholder={
                row.compatible.length > 0 ? t.chooseTemplateShort : p.noTemplate
              }
              items={Object.fromEntries(
                row.compatible.map((o) => [o.id, o.label]),
              )}
              defaultValue={choice}
              onValueChange={(value) => {
                setChoice(value);
                setError(null);
              }}
              action={
                organizationId
                  ? { label: p.newTemplate, onSelect: () => setAsking(true) }
                  : undefined
              }
              error={error ?? undefined}
            />
          </div>
          {row.compatible.length > 0 && (
            <Button
              type="button"
              size="lg"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={create}
            >
              {pending ? t.creating : t.create}
            </Button>
          )}
        </div>
        {(canAsk || row.compatible.length > 0) && organizationId && (
          <NewTemplateDialog
            open={asking}
            onOpenChange={setAsking}
            organizationId={organizationId}
            roles={row.formRoles}
            request={{ projectId, key: row.key, name: row.name }}
            onDone={onChange}
          />
        )}
      </div>
    );
  })();

  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="truncate text-sm text-muted-foreground">{rolesOf(row)}</p>
      </div>
      {action}
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
