"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { rolesOf } from "@/components/legal/contracts/contract-table";
import { NewTemplateDialog } from "@/components/legal/contracts/new-template-dialog";
import { OptionSelect } from "@/components/projects/option-select";
import { ReturnCallout } from "@/components/ui/return-callout";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { agreementTone, type Tone } from "@/lib/ui/state-tones";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

const fr = { legalContracts, legalDocuments };

export const NO_DEAL = "none";

/** A template made for this person and asked of the direction. */
export type RequestState = {
  name: string;
  pending: boolean;
  refusal: { by: string; reason: string } | null;
};

/** What is chosen for a person: a validated template, or no agreement. */
export type MappingChoice = {
  choice: string | null;
  fee: string;
  reason: string;
};

/** Where a person stands while the contracts are chosen (JUR-12). */
export function mappingPill(
  row: AgreementRow,
  value: MappingChoice,
  request: RequestState | null,
): { tone: Tone; label: string } | null {
  const t = fr.legalContracts.agreements;
  const c = t.choiceStates;
  if (!row.contactId) return null;
  if (row.contract)
    return { tone: agreementTone[row.state], label: t.states[row.state] };
  if (row.existing && value.choice === null)
    return { tone: "success", label: c.existing };
  if (value.choice === NO_DEAL) return { tone: "neutral", label: c.notNeeded };
  if (row.compatible.length === 0)
    return request?.pending
      ? { tone: "warning", label: c.pendingTemplate }
      : { tone: "warning", label: c.missingTemplate };
  return { tone: "info", label: c.needed };
}

/**
 * The fields of one person of « Contrats à prévoir », opened from their
 * line of the table (proto « Projet complet »): the contract to provide for
 * (validated templates for these roles, or « Pas d'accord nécessaire » with
 * why), the fee, where the proposal comes from, and « Nouveau modèle de
 * contrat » when no template fits.
 */
export function MappingEditor({
  row,
  value,
  onChange,
  errors,
  organizationId,
  projectId,
  request,
  direction,
  onRequested,
}: {
  row: AgreementRow;
  value: MappingChoice;
  onChange: (change: Partial<MappingChoice>) => void;
  errors: { choice?: string; reason?: string };
  organizationId: string | null;
  projectId: string;
  request: RequestState | null;
  // « Claire Morel », else « la direction ».
  direction: string;
  // A template asked for this person.
  onRequested?: () => void;
}) {
  const d = fr.legalDocuments.template;
  const t = fr.legalContracts.agreements;
  const p = t.plan;
  const roleLabel = rolesOf(row);
  const [creating, setCreating] = useState(false);
  // « + Nouveau modèle de contrat » at the end of the menu while none is
  // validated for these roles and none is already asked (Sacha 26/11/2026).
  const canAsk =
    row.compatible.length === 0 && organizationId !== null && !request?.pending;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <OptionSelect
          id={`contract-${row.key}`}
          name={`contract-${row.key}`}
          label={p.contract}
          required
          // The real situation, never « Pas d'accord nécessaire » as the
          // only answer offered (Sacha 26/11/2026).
          placeholder={row.compatible.length > 0 ? p.choose : p.noTemplate}
          items={{
            ...Object.fromEntries(row.compatible.map((o) => [o.id, o.label])),
            [NO_DEAL]: p.noDeal,
          }}
          action={
            canAsk
              ? { label: p.newTemplate, onSelect: () => setCreating(true) }
              : undefined
          }
          defaultValue={value.choice}
          onValueChange={(choice) => onChange({ choice })}
          error={errors.choice}
        />
        {value.choice && value.choice !== NO_DEAL && (
          <Field
            name={`fee-${row.key}`}
            label={
              row.proposal.feeFromFiche
                ? `${t.columns.fee} · ${t.feeFromFiche}`
                : t.columns.fee
            }
            aria-label={t.feeLabel(row.name)}
            inputMode="decimal"
            suffix="€"
            value={value.fee}
            onChange={(event) => onChange({ fee: event.target.value })}
          />
        )}
      </div>
      {value.choice === NO_DEAL && (
        <TextareaField
          id={`no-deal-${row.key}`}
          name={`no-deal-${row.key}`}
          label={p.noDealWhy}
          hint={p.noDealHint}
          required
          rows={2}
          maxLength={1000}
          value={value.reason}
          onChange={(event) => onChange({ reason: event.target.value })}
          error={errors.reason}
        />
      )}
      {(row.compatible.length > 0 || request?.pending) && (
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
          {row.compatible.length > 0
            ? p.proposedFrom(roleLabel)
            : d.pending(request!.name, direction)}
        </span>
      )}
      {row.existing && (
        <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.existing(row.existing.title)}
        </span>
      )}
      {row.compatible.length === 0 && request?.refusal && (
        <ReturnCallout
          by={request.refusal.by}
          outcome={d.refuseVerb}
          note={request.refusal.reason}
        />
      )}
      {canAsk && (
        <NewTemplateDialog
          open={creating}
          onOpenChange={setCreating}
          organizationId={organizationId!}
          roles={row.formRoles}
          request={{ projectId, key: row.key, name: row.name }}
          onDone={onRequested}
        />
      )}
    </div>
  );
}
