"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";

import { ClauseForm } from "@/components/legal/contracts/clause-form";
import { ContractDocumentCard } from "@/components/legal/contracts/contract-document-card";
import { ContractAwaiting } from "@/components/legal/signed-returns/contract-awaiting";
import {
  ContractSend,
  type ContractMailDraft,
} from "@/components/legal/signed-returns/contract-send";
import { PdsSignStep } from "@/components/legal/signed-returns/pds-sign-step";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ReturnCallout } from "@/components/ui/return-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { advanceContract } from "@/lib/contracts/actions";
import type { ContractProof } from "@/lib/contracts/proof";
import { legal } from "@/lib/i18n/fr/legal";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { formatShortDay } from "@/lib/utils/day";
import {
  generateLegalContract,
  saveAgreementFee,
} from "@/lib/legal/contracts/actions";
import { contractFix, ficheOfDemarche } from "@/lib/legal/contracts/fix";
import { amountInput } from "@/lib/utils/money";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { formatFee } from "@/lib/legal/contracts/fields";
import type { WriteResult } from "@/lib/utils/write-result";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";

const fr = {
  legal,
  legalContracts,
  legalDemarches,
  legalDocuments,
  signedReturns,
};

const sr = fr.signedReturns.team;

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
  draft = null,
  personLink,
  direction = fr.legalDemarches.direction,
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
  // The e-mail « Envoyer à … » will send (null: PDS OS cannot e-mail them).
  draft?: ContractMailDraft | null;
  // The person's page (/c/), THE link of the démarche: deposited signed there.
  personLink?: ReactNode;
  // Who signs for PDS (« Claire Morel », else « la direction »).
  direction?: string;
}) {
  const t = fr.legal.panels.contract;
  const d = fr.legalDocuments.contract;
  const [pending, startTransition] = useTransition();
  const contractId = row.contract?.id ?? null;

  const publish = usePublishResult();
  const run = (action: () => Promise<WriteResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? t.failed);
      publish(result);
    });
  const advance = (
    action: "submit" | "send" | "sign" | "countersign",
    extra?: { comment?: string; signedOn?: string; checked?: boolean },
  ) =>
    contractId && run(() => advanceContract({ contractId, action, ...extra }));

  // The contract's page is reached from its document card (« Fiche du
  // contrat », JUR-17), its PDF seen there in a new tab: no « Ouvrir le
  // contrat » under it any more (Sacha, 06/11/2026).
  // The fee as a fact with its source (JUR-15), as the Master's rates —
  // only when the template does not show it among its values.
  const fee = !row.fields.some((f) => f.id === "remuneration") && (
    <FactRows>
      <FactRow
        label={t.financial.title}
        value={
          row.proposal.feeCents
            ? formatFee(row.proposal.feeCents)
            : t.financial.none
        }
        source={
          row.proposal.feeCents
            ? row.proposal.feeFromFiche
              ? t.financial.fromFiche
              : t.financial.fromMapping
            : null
        }
      />
    </FactRows>
  );
  const fix = contractFix(row, projectId);
  // The document in head, from its generation on (rule 18).
  const documentCard = card && (
    <ContractDocumentCard
      row={row}
      data={card}
      projectTitle={projectTitle}
      fix={fix}
    />
  );
  // Before generation, the same card: the file to come, its values, the
  // fee changed on its line; what the person's fiche will bring said once
  // (JUR-10: « Il manque les renseignements de X pour préparer … »).
  const fromFiche = row.fields.filter(
    (f) => f.status === "missing" && f.home === "fiche",
  );
  const toGenerate = (
    <>
      {fromFiche.length > 0 && (
        <ToneCallout tone="warning">
          {t.missingFromFiche(
            row.name,
            fromFiche.map((f) => f.label).join(", "),
          )}{" "}
          <Link
            href={ficheOfDemarche(projectId, row.key)}
            className="underline underline-offset-4"
          >
            {fr.legalContracts.checklist.fixAt.fiche}
          </Link>
        </ToneCallout>
      )}
      <ContractDocumentCard
        row={row}
        data={null}
        projectTitle={projectTitle}
        fix={fix}
        fee={
          row.contract
            ? undefined
            : {
                value: row.proposal.feeCents
                  ? amountInput(row.proposal.feeCents)
                  : "",
                onSave: (value) => saveAgreementFee(projectId, row.key, value),
              }
        }
      />
    </>
  );

  switch (row.state) {
    case "not_needed":
      return <ToneCallout tone="neutral">{t.notNeeded}</ToneCallout>;
    case "unmapped":
      return (
        <ToneCallout tone="info">
          {t.unmapped}{" "}
          <Link
            href={routes.projectLegalStep(projectId, "plan")}
            className="underline underline-offset-4"
          >
            {t.toMapping}
          </Link>
        </ToneCallout>
      );
    // What is missing, each value at its source (the sentence under the
    // step's title, `contractLead`).
    case "needs_info":
      return toGenerate;
    case "ready_to_generate":
      return (
        <>
          {toGenerate}
          <Button
            className="self-start"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() =>
              run(() => generateLegalContract(projectId, row.needId!))
            }
          >
            {fr.legalContracts.agreements.generate}
          </Button>
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
          </div>
        </>
      );
    case "review_required":
      if (!canValidate)
        return (
          <>
            {documentCard}
            {/* Who is awaited, in the Master's blue. */}
            <ToneCallout tone="info">
              {t.waitingDirection(direction)}
            </ToneCallout>
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
              // Kept whole: what follows is said by the panel.
              return result.ok
                ? result
                : { ok: false, error: result.error ?? t.failed };
            }}
          />
        </>
      );
    // PDS signs first (Sacha, 06/11/2026): the direction drops the PDF it
    // signed for PDS, then it is sent — that PDF is what the person signs.
    case "ready_for_signature":
      return (
        <>
          {documentCard}
          {contractId &&
            (proof?.countersign ? (
              <>
                <FactRows>
                  <FactRow
                    label={sr.pdsSignedTitle}
                    value={sr.pdsSignedBy(
                      proof.countersign.by,
                      formatShortDay(proof.countersign.at),
                    )}
                    source={proof.pdsSigned?.fileName ?? null}
                    side={
                      proof.pdsSigned?.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={
                            <a
                              href={proof.pdsSigned.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          {sr.viewPdf}
                        </Button>
                      )
                    }
                  />
                </FactRows>
                <ContractSend
                  projectId={projectId}
                  contractId={contractId}
                  person={row.name}
                  draft={draft}
                />
              </>
            ) : (
              <PdsSignStep
                contractId={contractId}
                organizationId={organizationId}
                proof={proof}
                canSign={canValidate}
                direction={direction}
                pending={pending}
                onSign={() => advance("countersign")}
              />
            ))}
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
              onSign={(signedOn, checked) =>
                advance("sign", { signedOn, checked })
              }
              version={card?.version ?? null}
              canCountersign={canValidate}
              direction={direction}
              onCountersign={() => advance("countersign")}
              personLink={personLink}
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
        </>
      );
  }
}
