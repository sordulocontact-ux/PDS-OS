"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { secureClearanceFlow } from "@/lib/legal/clearance/flow-actions";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { contractStateTone } from "@/lib/ui/state-tones";

import { ClearanceContractSend } from "./clearance-contract-send";
import { termsLine } from "./clearance-stages";
import { ContractProofSlot } from "./contract-proof-slot";
import { DocumentsTab } from "./documents-tab";
import { useLegalAction } from "@/components/legal/use-legal-action";

const fr = { contracts, legalClearance, legalDemarches };

/**
 * « Signer »: the authorisation contract prepared (and approved) when the
 * direction validated the conditions; its owner sends it, e-mailed by PDS
 * OS with the contract joined or declared sent another way
 * (`ClearanceContractSend`, the way it went is its proof); then the signed copy
 * and its proof dropped here, and « Marquer comme sécurisé ». Whoever else
 * looks is told who acts next (`StepWaiting`); a contract sent back to draft
 * or in review is submitted / validated on its own page.
 */
export function SignMoment({
  projectId,
  clearance,
  context,
  directionName,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
  directionName?: string;
}) {
  const t = fr.legalClearance.flow;
  const { pending, run } = useLegalAction({ refresh: true });
  const [tried, setTried] = useState(false);
  // One contract usually holds every concerned right: shown once.
  const contracts = clearance.contracts.filter(
    (c, i, all) => all.findIndex((x) => x.id === c.id) === i,
  );

  // A borrowing reached here without its contract (before 07/10): attach
  // or create it as before.
  if (contracts.length === 0)
    return (
      <DocumentsTab
        projectId={projectId}
        clearance={clearance}
        projectContracts={context.projectContracts}
      />
    );

  // The least advanced contract says what comes next: submitted by its
  // owner, validated by the direction, sent by its owner, then signed.
  const draft = contracts.find((c) => c.state === "draft");
  const review = contracts.find((c) => c.state === "in_review");
  const toSend = contracts.find((c) => c.state === "approved");
  const next = draft ?? review ?? toSend;
  const ownerOf = (c: (typeof contracts)[number]) =>
    c.ownerName || t.responsible;
  // The viewer's gesture happens on the contract's page: its button leads.
  const openLabel = (c: (typeof contracts)[number]) =>
    c.state === "draft" && c.ownerIsViewer
      ? t.openToSubmit
      : c.state === "in_review" && context.canValidate
        ? t.openToDecide
        : null;
  const emailed = contracts.find((c) => c.signedByEmail);
  const missing = contracts.flatMap((c) => [
    ...(c.signedFile ? [] : [t.signedMissing]),
    ...(c.evidenceFile ? [] : [t.evidenceMissing]),
  ]);

  return (
    <>
      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium break-words">{t.contractCard}</span>
              <StatusBadge tone={contractStateTone[contract.state]} size="sm">
                {fr.contracts.states[contract.state]}
              </StatusBadge>
            </span>
            <span className="text-sm text-muted-foreground">
              {t.contractDetail(termsLine(clearance))}
            </span>
          </span>
          <Button
            variant={openLabel(contract) ? "default" : "outline"}
            size="sm"
            nativeButton={false}
            render={<Link href={routes.contract(contract.id)} />}
          >
            {openLabel(contract) ?? t.openContract}
          </Button>
        </div>
      ))}

      {next && next !== toSend ? (
        // Submitted by its owner, then validated by the direction: on the
        // contract's page; said here as « À vous » or « En attente de ».
        next.state === "draft" ? (
          next.ownerIsViewer ? (
            <p className="text-sm font-medium">{t.toSubmit}</p>
          ) : (
            <StepWaiting who={ownerOf(next)} todo={t.awaitSubmit} />
          )
        ) : context.canValidate ? (
          <p className="text-sm font-medium">{t.toDecide}</p>
        ) : (
          <StepWaiting
            who={directionName || fr.legalDemarches.direction}
            todo={t.awaitDecide}
          />
        )
      ) : toSend && !toSend.ownerIsViewer ? (
        <StepWaiting who={ownerOf(toSend)} todo={t.awaitSend} />
      ) : toSend ? (
        <ClearanceContractSend
          projectId={projectId}
          clearance={clearance}
          canEmail={context.emailEnabled}
        />
      ) : (
        <>
          {emailed ? (
            // Sent back by e-mail and kept by PDS OS: a person checks it.
            <ToneCallout
              tone="info"
              as="div"
              contentClassName="flex flex-col items-start gap-2"
            >
              <span>{t.signedByEmail}</span>
              {emailed.signedByEmail?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={emailed.signedByEmail.url}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  {t.seeSigned}
                </Button>
              )}
            </ToneCallout>
          ) : (
            <p className="text-sm text-muted-foreground">{t.sentHint}</p>
          )}
          {context.organizationId &&
            contracts.map((contract) => (
              <div key={contract.id} className="grid gap-2 sm:grid-cols-2">
                <ContractProofSlot
                  organizationId={context.organizationId!}
                  contractId={contract.id}
                  category="signed"
                  label={fr.legalClearance.stages.sign.signedSlot}
                  hint={fr.legalClearance.stages.sign.slotHint}
                  present={contract.signedFile}
                  invalid={tried && !contract.signedFile}
                />
                <ContractProofSlot
                  organizationId={context.organizationId!}
                  contractId={contract.id}
                  category="evidence"
                  label={fr.legalClearance.stages.sign.evidenceSlot}
                  hint={fr.legalClearance.stages.sign.evidenceHint}
                  present={contract.evidenceFile}
                  invalid={tried && !contract.evidenceFile}
                />
              </div>
            ))}
          {tried && missing.length > 0 && (
            <FormMessage kind="error">
              {t.filesMissing(missing.join(t.and))}
            </FormMessage>
          )}
          <Button
            className="self-start"
            variant={missing.length === 0 ? "default" : "outline"}
            disabled={pending}
            onClick={() => {
              if (missing.length > 0) return setTried(true);
              run(() => secureClearanceFlow(projectId, clearance.id));
            }}
          >
            {t.secure}
          </Button>
        </>
      )}
    </>
  );
}
