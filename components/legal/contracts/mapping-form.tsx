"use client";

import { Fragment, useState, useTransition } from "react";

import { usePublishResult } from "@/components/shell/module/result-banner";
import { FormMessage } from "@/components/auth/form-message";
import {
  ContractTable,
  ContractTableEditor,
  ContractTableRow,
  rolesOf,
} from "@/components/legal/contracts/contract-table";
import {
  MappingEditor,
  mappingPill,
  NO_DEAL,
  type MappingChoice,
  type RequestState,
} from "@/components/legal/contracts/mapping-row";
import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { isOnlyPaid } from "@/lib/legal/contracts/no-deal";
import { approveContractMapping } from "@/lib/legal/contracts/actions";
import { feeCentsOf, formatFee } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

const fr = { legalContracts, legalDocuments };

const feeText = (cents: number | null) =>
  cents === null ? "" : String(cents / 100).replace(".", ",");

function initialOf(row: AgreementRow): MappingChoice {
  const fee = feeText(row.proposal.feeCents);
  if (row.needId) return { choice: row.template?.id ?? null, fee, reason: "" };
  if (row.noAgreementReason)
    return { choice: NO_DEAL, fee, reason: row.noAgreementReason };
  if (!row.proposal.needed)
    return {
      choice: NO_DEAL,
      fee,
      reason: row.existing
        ? fr.legalContracts.agreements.existing(row.existing.title)
        : "",
    };
  return { choice: row.proposal.templateId, fee, reason: "" };
}

/**
 * « Contrats à prévoir » (proto « Projet complet », lot 9 J3): a contract
 * per person, proposed from their role, confirmed together — neither
 * validating their content nor generating them. One line per person in a
 * table (Sacha, 06/11/2026); a click on a line opens its fields under it,
 * one at a time. Each person needs a validated template or « Pas d'accord
 * nécessaire » with why; what is missing turns red with its reason on
 * « Confirmer », on its line, and the first one opens. A person without a
 * contact waits for their fiche; a generated agreement is fixed.
 */
export function MappingForm({
  projectId,
  rows,
  organizationId,
  requests,
  direction,
  onDone,
  onCancel,
  onRequested,
}: {
  projectId: string;
  rows: AgreementRow[];
  organizationId: string | null;
  requests: Record<string, RequestState>;
  direction: string;
  onDone: () => void;
  onCancel?: () => void;
  // A template asked for a person (« Nouveau modèle de contrat »).
  onRequested?: () => void;
}) {
  const t = fr.legalContracts.agreements;
  const open = rows.filter((r) => r.contactId && !r.contract);
  const [choices, setChoices] = useState<Record<string, MappingChoice>>(() =>
    Object.fromEntries(open.map((r) => [r.key, initialOf(r)])),
  );
  const [tried, setTried] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();
  const set = (key: string, change: Partial<MappingChoice>) =>
    setChoices((all) => ({ ...all, [key]: { ...all[key], ...change } }));

  const errorsOf = (row: AgreementRow) => {
    const c = choices[row.key];
    if (!tried || !c) return {};
    if (!c.choice)
      return {
        choice: requests[row.key]?.pending
          ? fr.legalDocuments.template.waits(row.name, direction)
          : t.plan.choiceMissing(row.name),
      };
    if (c.choice === NO_DEAL && !c.reason.trim())
      return { reason: t.errors.reason };
    if (c.choice === NO_DEAL && isOnlyPaid(c.reason))
      return { reason: t.plan.onlyPaid };
    return {};
  };

  function submit() {
    setTried(true);
    const wrong = open.filter((r) => {
      const c = choices[r.key];
      return (
        !c.choice ||
        (c.choice === NO_DEAL && (!c.reason.trim() || isOnlyPaid(c.reason)))
      );
    });
    if (wrong.length > 0) {
      setError(t.plan.remaining);
      const c = choices[wrong[0].key];
      setOpenKey(wrong[0].key);
      requestAnimationFrame(() =>
        document
          .getElementById(
            c.choice ? `no-deal-${wrong[0].key}` : `contract-${wrong[0].key}`,
          )
          ?.focus(),
      );
      return;
    }
    const fee = (c: MappingChoice) =>
      c.choice !== NO_DEAL ? c.fee.trim() : "";
    if (
      open.some(
        (r) => fee(choices[r.key]) && feeCentsOf(fee(choices[r.key])) === null,
      )
    )
      return setError(t.errors.fee);
    const items = open.map((r) => {
      const c = choices[r.key];
      const needed = c.choice !== NO_DEAL;
      return {
        key: r.key,
        needed,
        templateId: needed ? c.choice : null,
        feeCents: fee(c) ? feeCentsOf(fee(c)) : null,
        reason: needed ? null : c.reason.trim(),
      };
    });
    startTransition(async () => {
      setError(null);
      const result = await approveContractMapping({ projectId, items });
      if (!result.ok) return setError(result.error);
      setOpenKey(null);
      publish(result, t.plan.done);
      onDone();
    });
  }

  const p = t.plan;
  // What the line says of the choice: the contract, or what is missing.
  const contractOf = (row: AgreementRow, c: MappingChoice) =>
    c.choice === NO_DEAL
      ? p.noDeal
      : c.choice
        ? (row.compatible.find((o) => o.id === c.choice)?.label ??
          row.template?.name ??
          p.choose)
        : row.existing
          ? t.existing(row.existing.title)
          : p.choose;
  const feeOf = (c: MappingChoice) => {
    const cents =
      c.choice && c.choice !== NO_DEAL && c.fee.trim()
        ? feeCentsOf(c.fee.trim())
        : null;
    return cents === null ? null : formatFee(cents, { ht: false });
  };
  // The exception under the line: an error once tried, the justification,
  // or why no template is proposed.
  const noteOf = (row: AgreementRow, c: MappingChoice) => {
    const e = errorsOf(row);
    if (e.choice || e.reason)
      return { text: e.choice ?? e.reason, tone: "error" as const };
    if (c.choice === NO_DEAL && c.reason.trim())
      return { text: p.noDealReason(c.reason.trim()), tone: "muted" as const };
    if (row.compatible.length === 0 && c.choice !== NO_DEAL)
      return {
        text: requests[row.key]?.pending
          ? fr.legalDocuments.template.pending(
              requests[row.key]!.name,
              direction,
            )
          : p.noTemplateSource,
        tone: "muted" as const,
      };
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <ContractTable>
        {rows.map((row) => {
          const c = choices[row.key];
          const request = requests[row.key] ?? null;
          // No contact yet, or a contract already generated: fixed.
          if (!c)
            return (
              <ContractTableRow
                key={row.key}
                name={row.name}
                roles={rolesOf(row)}
                contract={
                  row.contract ? (row.template?.name ?? p.choose) : t.noContact
                }
                fee={
                  row.contract && row.proposal.feeCents
                    ? formatFee(row.proposal.feeCents, { ht: false })
                    : null
                }
                state={mappingPill(
                  row,
                  { choice: null, fee: "", reason: "" },
                  request,
                )}
              />
            );
          const open = openKey === row.key;
          const note = noteOf(row, c);
          return (
            <Fragment key={row.key}>
              <ContractTableRow
                name={row.name}
                roles={rolesOf(row)}
                contract={contractOf(row, c)}
                fee={feeOf(c)}
                state={mappingPill(row, c, request)}
                note={note?.text}
                noteTone={note?.tone}
                open={open}
                label={t.plan.editOf(row.name)}
                onClick={() => setOpenKey(open ? null : row.key)}
              />
              {open && (
                <ContractTableEditor>
                  <MappingEditor
                    row={row}
                    value={c}
                    onChange={(change) => set(row.key, change)}
                    errors={errorsOf(row)}
                    organizationId={organizationId}
                    projectId={projectId}
                    request={request}
                    direction={direction}
                    onRequested={onRequested}
                  />
                  {/* Alone: in outline, never a lone ghost (docs/DESIGN.md
                      « Bouton secondaire »). */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setOpenKey(null)}
                  >
                    {t.plan.close}
                  </Button>
                </ContractTableEditor>
              )}
            </Fragment>
          );
        })}
      </ContractTable>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {/* The main action first, on the left (C0). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          disabled={pending || open.length === 0}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {pending ? t.approving : t.approveMapping}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancelEdit}
          </Button>
        )}
      </div>
    </div>
  );
}
