"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import {
  MappingRow,
  NO_DEAL,
  type MappingChoice,
  type RequestState,
} from "@/components/legal/contracts/mapping-row";
import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { isOnlyPaid } from "@/lib/legal/contracts/no-deal";
import { approveContractMapping } from "@/lib/legal/contracts/actions";
import { feeCentsOf } from "@/lib/legal/contracts/fields";
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
 * validating their content nor generating them. Each person needs a
 * validated template or « Pas d'accord nécessaire » with why; what is
 * missing turns red with its reason on « Confirmer ». A person without a
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
}: {
  projectId: string;
  rows: AgreementRow[];
  organizationId: string | null;
  requests: Record<string, RequestState>;
  direction: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.legalContracts.agreements;
  const open = rows.filter((r) => r.contactId && !r.contract);
  const [choices, setChoices] = useState<Record<string, MappingChoice>>(() =>
    Object.fromEntries(open.map((r) => [r.key, initialOf(r)])),
  );
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
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
      document
        .getElementById(
          c.choice ? `no-deal-${wrong[0].key}` : `contract-${wrong[0].key}`,
        )
        ?.focus();
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
      toast.success(t.plan.done);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
        {rows.map((row) => (
          <MappingRow
            key={row.key}
            row={row}
            value={choices[row.key] ?? { choice: null, fee: "", reason: "" }}
            onChange={(change) => set(row.key, change)}
            errors={errorsOf(row)}
            organizationId={organizationId}
            projectId={projectId}
            request={requests[row.key] ?? null}
            direction={direction}
          />
        ))}
      </ul>
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
