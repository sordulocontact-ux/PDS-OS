"use client";

import Link from "next/link";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  secureClearanceFlow,
  sendClearanceContract,
} from "@/lib/legal/clearance/flow-actions";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { contractStateTone } from "@/lib/ui/state-tones";

import { termsLine } from "./clearance-stages";
import { ContractProofSlot } from "./contract-proof-slot";
import { DocumentsTab } from "./documents-tab";
import { useLegalAction } from "@/components/legal/use-legal-action";

/**
 * « Signer »: the authorisation contract prepared when the direction
 * validated the conditions; « Envoyé par e-mail » (the way it went is its
 * proof of sending); then the signed copy and its proof dropped here, and
 * « Marquer comme sécurisé ».
 */
export function SignMoment({
  projectId,
  clearance,
  context,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
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

  const toSend = contracts.some((c) => c.state === "approved");
  const waitsDirector = contracts.some(
    (c) => c.state === "draft" || c.state === "in_review",
  );
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
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={routes.contract(contract.id)} />}
          >
            {t.openContract}
          </Button>
        </div>
      ))}

      {waitsDirector ? (
        <p className="text-sm text-muted-foreground">{t.contractWaits}</p>
      ) : toSend ? (
        <>
          <p className="text-sm text-muted-foreground">{t.sendHint}</p>
          <div className="flex flex-wrap gap-2">
            {t.sendBy.map((how) => (
              <Button
                key={how}
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    sendClearanceContract({
                      projectId,
                      clearanceId: clearance.id,
                      how,
                    }),
                  )
                }
              >
                {how}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t.sentHint}</p>
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
