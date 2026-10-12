"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { NextCard } from "@/components/legal/tracking/next-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { advanceContract } from "@/lib/contracts/actions";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { generateLegalContract } from "@/lib/legal/contracts/actions";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { withReturn } from "@/lib/ui/return-to";
import { factTone } from "@/lib/ui/state-tones";

/** The values of the contract, each with its source (« Rempli
 * automatiquement » / « Manquant », ticket Juridique 03). */
function Values({
  row,
  open,
  projectId,
}: {
  row: AgreementRow;
  open: boolean;
  projectId: string;
}) {
  const t = fr.legalContracts;
  const p = fr.legal.panels.contract;
  const missingFields = row.fields.filter((f) => f.value === null);
  const missing = missingFields.length;
  const fromFiche = missingFields.filter((f) => f.home === "fiche");
  // Back to this person's panel once the value is completed (JUR-10).
  const back = `${routes.projectLegalStep(projectId, "plan")}?ligne=person:${row.key}`;
  const fixHref = (home: string): string | null =>
    home === "network" && row.contactId
      ? withReturn(routes.networkContact(row.contactId), back)
      : home === "mapping"
        ? routes.projectLegalStep(projectId, "contracts")
        : home === "credits"
          ? routes.projectLegal(projectId)
          : null;
  return (
    <details open={open} className="group rounded-xl border p-4">
      <summary className="cursor-pointer list-none text-sm text-muted-foreground marker:hidden">
        {fr.legal.panels.contract.values(row.fields.length, missing)}
      </summary>
      {fromFiche.length > 0 && (
        <ToneCallout tone="warning" className="mt-3">
          {p.missingFromFiche(
            row.name,
            fromFiche.map((f) => f.label).join(", "),
          )}
        </ToneCallout>
      )}
      <ul className="mt-3 flex flex-col divide-y">
        {row.fields.map((field) => (
          <li
            key={field.id}
            className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">
                {field.label}
              </span>
              <span className="font-medium break-words">
                {field.value ?? t.fillIn[field.home]}
              </span>
            </span>
            <span className="flex shrink-0 flex-col gap-1 sm:items-end">
              <StatusBadge
                tone={factTone[field.value ? "known" : "missing"]}
                size="sm"
              >
                {field.value ? t.agreements.filled : t.agreements.missing}
              </StatusBadge>
              {field.source && (
                <span className="text-sm text-muted-foreground">
                  {t.sources[field.source]}
                </span>
              )}
              {!field.value && fixHref(field.home) && (
                <Link
                  href={fixHref(field.home)!}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {p.complete}
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * One person's contract in the plan's panel (the prototype's): generated
 * from its template, read and submitted, validated by the direction, sent
 * (the way it went is its proof of sending), then its signed copy and its
 * proof dropped here and the contract marked signed.
 */
export function ContractPanel({
  projectId,
  row,
  canValidate,
  organizationId,
  proof,
}: {
  projectId: string;
  row: AgreementRow;
  canValidate: boolean;
  organizationId: string | null;
  proof: ContractProof | null;
}) {
  const t = fr.legal.panels.contract;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [changes, setChanges] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const contractId = row.contract?.id ?? null;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? t.failed);
      setChanges(null);
      router.refresh();
    });
  const advance = (
    action: "submit" | "approve" | "request_changes" | "send" | "sign",
    extra?: { comment?: string; signedOn?: string },
  ) =>
    contractId && run(() => advanceContract({ contractId, action, ...extra }));

  const open = contractId && (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href={routes.contract(contractId)} />}
    >
      {t.openContract}
    </Button>
  );
  const head = (
    <div className="flex flex-col gap-1">
      {row.template && (
        <p className="text-sm text-muted-foreground">
          {`${row.template.name} · v${row.template.version}`}
        </p>
      )}
      {/* JUR-15: the fee recorded, with where it comes from. */}
      <p className="text-sm">
        <span className="text-muted-foreground">{t.financial.title} · </span>
        {row.proposal.feeCents
          ? t.financial.amount(
              formatFee(row.proposal.feeCents),
              row.proposal.feeFromFiche
                ? t.financial.fromFiche
                : t.financial.fromMapping,
            )
          : t.financial.none}
      </p>
    </div>
  );

  switch (row.state) {
    case "not_needed":
      return <ToneCallout tone="neutral">{t.notNeeded}</ToneCallout>;
    case "unmapped":
      return <ToneCallout tone="info">{t.unmapped}</ToneCallout>;
    case "needs_info":
      return (
        <>
          <NextCard kind="act" label={t.next} title={t.needsInfo}>
            <p className="text-sm text-muted-foreground">{t.needsInfoBody}</p>
          </NextCard>
          <Values row={row} open projectId={projectId} />
        </>
      );
    case "ready_to_generate":
      return (
        <>
          <NextCard kind="act" label={t.next} title={t.generate}>
            {head}
            <Button
              className="self-start"
              disabled={pending}
              onClick={() =>
                run(() => generateLegalContract(projectId, row.needId!))
              }
            >
              {fr.legalContracts.agreements.generate}
            </Button>
          </NextCard>
          <Values row={row} open={false} projectId={projectId} />
        </>
      );
    case "draft":
      return (
        <>
          <NextCard kind="act" label={t.next} title={t.submit}>
            {head}
            <p className="text-sm text-muted-foreground">{t.submitBody}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => advance("submit")}>
                {t.submitAction}
              </Button>
              {open}
            </div>
          </NextCard>
          <Values row={row} open={false} projectId={projectId} />
        </>
      );
    case "review_required":
      if (!canValidate)
        return (
          <>
            <NextCard kind="wait" label={t.atDirection} title={t.reviewWait}>
              <p className="text-sm text-muted-foreground">
                {t.reviewWaitBody}
              </p>
            </NextCard>
            <Values row={row} open={false} projectId={projectId} />
          </>
        );
      return (
        <>
          <NextCard kind="decision" label={t.decision} title={t.review}>
            <p className="text-sm text-muted-foreground">{t.reviewBody}</p>
            {changes !== null && (
              <TextareaField
                name={`changes-${row.key}`}
                label={t.changesLabel}
                aria-required
                rows={3}
                maxLength={2000}
                value={changes}
                onChange={(event) => setChanges(event.target.value)}
                error={tried && !changes.trim() ? t.changesMissing : undefined}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {changes === null ? (
                <>
                  <Button disabled={pending} onClick={() => advance("approve")}>
                    {t.approve}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setChanges("")}
                  >
                    {t.requestChanges}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={pending}
                    onClick={() => {
                      if (!changes.trim()) return setTried(true);
                      advance("request_changes", { comment: changes });
                    }}
                  >
                    {t.sendChanges}
                  </Button>
                  <Button variant="ghost" onClick={() => setChanges(null)}>
                    {fr.legalSplits.public.cancel}
                  </Button>
                </>
              )}
              {open}
            </div>
          </NextCard>
          <Values row={row} open projectId={projectId} />
        </>
      );
    case "ready_for_signature":
      return (
        <NextCard kind="act" label={t.next} title={t.send}>
          <p className="text-sm text-muted-foreground">{t.sendBody}</p>
          <div className="flex flex-wrap gap-2">
            {fr.legalClearance.flow.sendBy.map((how) => (
              <Button
                key={how}
                variant="outline"
                disabled={pending}
                onClick={() => advance("send", { comment: how })}
              >
                {how}
              </Button>
            ))}
          </div>
          {open}
        </NextCard>
      );
    case "signature_pending": {
      const missing = [
        ...(proof?.signed ? [] : [fr.legalClearance.flow.signedMissing]),
        ...(proof?.evidence ? [] : [fr.legalClearance.flow.evidenceMissing]),
      ];
      return (
        <NextCard kind="wait" label={t.waiting} title={t.deposit}>
          {organizationId && contractId && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ContractProofSlot
                organizationId={organizationId}
                contractId={contractId}
                category="signed"
                label={fr.legalClearance.stages.sign.signedSlot}
                hint={fr.legalClearance.stages.sign.slotHint}
                present={proof?.signed ?? false}
                invalid={tried && !proof?.signed}
              />
              <ContractProofSlot
                organizationId={organizationId}
                contractId={contractId}
                category="evidence"
                label={fr.legalClearance.stages.sign.evidenceSlot}
                hint={fr.legalClearance.stages.sign.evidenceHint}
                present={proof?.evidence ?? false}
                invalid={tried && !proof?.evidence}
              />
            </div>
          )}
          {tried && missing.length > 0 && (
            <FormMessage kind="error">
              {fr.legalClearance.flow.filesMissing(
                missing.join(fr.legalClearance.flow.and),
              )}
            </FormMessage>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={missing.length === 0 ? "default" : "outline"}
              disabled={pending}
              onClick={() => {
                if (missing.length > 0) return setTried(true);
                advance("sign", { signedOn: todayInParis(new Date()) });
              }}
            >
              {t.markSigned}
            </Button>
            {open}
          </div>
        </NextCard>
      );
    }
    default:
      return (
        <>
          <ToneCallout tone="success">
            <span className="font-medium">{t.signed}</span>
            {row.financialNeedCents
              ? ` — ${fr.legalContracts.agreements.waitingInvoice(
                  formatFee(row.financialNeedCents),
                )}`
              : ""}
          </ToneCallout>
          {open}
        </>
      );
  }
}
