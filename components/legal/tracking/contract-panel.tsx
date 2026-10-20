"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { ClauseForm } from "@/components/legal/contracts/clause-form";
import { ContractDocumentCard } from "@/components/legal/contracts/contract-document-card";
import { ContractAwaiting } from "@/components/legal/signed-returns/contract-awaiting";
import { ContractSend } from "@/components/legal/signed-returns/contract-send";
import {
  ContractValues,
  contractFixHref,
} from "@/components/legal/tracking/contract-values";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { NextCard } from "@/components/ui/next-card";
import { ReturnCallout } from "@/components/ui/return-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { advanceContract } from "@/lib/contracts/actions";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";
import { generateLegalContract } from "@/lib/legal/contracts/actions";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

/**
 * One person's contract in their démarche (proto « Projet complet »): once
 * generated, the document in head of the card at every step that follows
 * (name, version, « Voir le PDF », its values with their source, « Changé
 * depuis la v1 »); read and submitted — a clause changed in place, the
 * direction's return signed at the top — validated by the direction, sent
 * (the way it went is its proof of sending), then its signed copy and its
 * proof dropped here and the contract marked signed.
 */
export function ContractPanel({
  projectId,
  projectTitle,
  row,
  canValidate,
  organizationId,
  proof,
  card,
  owner,
  invoice,
  hasLink = false,
  personLink,
}: {
  projectId: string;
  projectTitle: string;
  row: AgreementRow;
  canValidate: boolean;
  organizationId: string | null;
  proof: ContractProof | null;
  card: ContractCardData | null;
  // The démarche's responsible (« Revient signé en tête de l'étape de … »).
  owner: string;
  // The invoice block, once the contract is signed (J10).
  invoice?: ReactNode;
  // The person's private page (/c/): sent there, deposited signed there.
  hasLink?: boolean;
  personLink?: ReactNode;
}) {
  const t = fr.legal.panels.contract;
  const d = fr.legalDocuments.contract;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const contractId = row.contract?.id ?? null;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? t.failed);
      router.refresh();
    });
  const advance = (
    action: "submit" | "send" | "sign",
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
  const fee = (
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
  );
  // The document in head, from its generation on (rule 18).
  const documentCard = card && (
    <ContractDocumentCard
      row={row}
      data={card}
      projectTitle={projectTitle}
      fixHref={contractFixHref(row, projectId)}
    />
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
          <ContractValues row={row} open projectId={projectId} />
        </>
      );
    case "ready_to_generate":
      return (
        <>
          <NextCard kind="act" label={t.next} title={t.generate}>
            {fee}
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
          <ContractValues row={row} open={false} projectId={projectId} />
        </>
      );
    case "draft":
      return (
        <>
          {card?.review && (
            <ReturnCallout
              by={card.review.by}
              outcome={d.returnVerb}
              note={card.review.note}
            />
          )}
          {documentCard}
          {fee}
          {card && contractId && (
            <ClauseForm
              projectId={projectId}
              contractId={contractId}
              body={card.body}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => advance("submit")}>
              {card?.review ? d.resubmit : t.submitAction}
            </Button>
            {open}
          </div>
        </>
      );
    case "review_required":
      if (!canValidate)
        return (
          <>
            {documentCard}
            <NextCard kind="wait" label={t.atDirection} title={t.reviewWait}>
              <p className="text-sm text-muted-foreground">
                {t.reviewWaitBody}
              </p>
            </NextCard>
          </>
        );
      return (
        <>
          {documentCard}
          {fee}
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {d.decide}
          </p>
          <DecisionPanel
            id={`contract-${row.key}`}
            title={null}
            commentLabel={d.changesLabel}
            commentHint={d.returnHint(owner)}
            commentRequired={t.changesMissing}
            outcomes={[
              { kind: "approve", label: t.approve, done: d.approved },
              {
                kind: "request_changes",
                label: t.requestChanges,
                done: d.changesSent,
              },
            ]}
            onDecide={async (kind, comment) => {
              if (!contractId) return { ok: false, error: t.failed };
              const result = await advanceContract({
                contractId,
                action: kind === "approve" ? "approve" : "request_changes",
                comment: comment || undefined,
              });
              return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? t.failed };
            }}
            onDone={() => router.refresh()}
          />
        </>
      );
    case "ready_for_signature":
      return (
        <>
          {documentCard}
          <NextCard kind="act" label={t.next} title={t.send}>
            {contractId && (
              <ContractSend
                projectId={projectId}
                contractId={contractId}
                contactId={row.contactId}
                person={row.name}
                hasLink={hasLink}
              />
            )}
          </NextCard>
          {personLink}
          {open}
        </>
      );
    case "signature_pending":
      return (
        <>
          {documentCard}
          {contractId && (
            <ContractAwaiting
              person={row.name}
              contractId={contractId}
              organizationId={organizationId}
              proof={proof}
              pending={pending}
              onSign={(signedOn) => advance("sign", { signedOn })}
              personLink={personLink}
              extra={open}
            />
          )}
        </>
      );
    default:
      return (
        <>
          {documentCard}
          <ToneCallout tone="success">
            <span className="font-medium">{t.signed}</span>
          </ToneCallout>
          {invoice}
          {open}
        </>
      );
  }
}
