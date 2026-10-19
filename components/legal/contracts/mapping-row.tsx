"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { NewTemplateButton } from "@/components/legal/contracts/new-template-button";
import { OptionSelect } from "@/components/projects/option-select";
import { fr } from "@/lib/i18n/fr";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

export const NO_DEAL = "none";

/** What is chosen for a person: a validated template, or no agreement. */
export type MappingChoice = {
  choice: string | null;
  fee: string;
  reason: string;
};

/**
 * One person of « Contrats à prévoir » (proto « Projet complet »): name and
 * roles, the contract to provide for (validated templates for these roles,
 * or « Pas d'accord nécessaire » with why), the fee, where the proposal
 * comes from, and « Nouveau modèle de contrat » when no template fits.
 */
export function MappingRow({
  row,
  value,
  onChange,
  errors,
  organizationId,
}: {
  row: AgreementRow;
  value: MappingChoice;
  onChange: (change: Partial<MappingChoice>) => void;
  errors: { choice?: string; reason?: string };
  organizationId: string | null;
}) {
  const t = fr.legalContracts.agreements;
  const p = t.plan;
  const roles = row.creditRoles.map((r) => fr.masterPage.credits.roles[r]);
  const roleLabel = roles.join(", ") || fr.legalForms.roles.performer;
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold break-words">{row.name}</span>
        <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {roleLabel}
        </span>
      </div>
      {!row.contactId ? (
        <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.noContact}
        </span>
      ) : row.contract ? (
        <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.states[row.state]}
        </span>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <OptionSelect
              id={`contract-${row.key}`}
              name={`contract-${row.key}`}
              label={p.contract}
              required
              placeholder={p.choose}
              items={{
                ...Object.fromEntries(
                  row.compatible.map((o) => [o.id, o.label]),
                ),
                [NO_DEAL]: p.noDeal,
              }}
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
              required
              rows={2}
              maxLength={1000}
              value={value.reason}
              onChange={(event) => onChange({ reason: event.target.value })}
              error={errors.reason}
            />
          )}
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
            {row.compatible.length > 0
              ? p.proposedFrom(roleLabel)
              : p.noTemplateSource}
          </span>
          {row.existing && (
            <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.existing(row.existing.title)}
            </span>
          )}
          {row.compatible.length === 0 && organizationId && (
            <NewTemplateButton
              organizationId={organizationId}
              roles={row.formRoles}
            />
          )}
        </div>
      )}
    </li>
  );
}
