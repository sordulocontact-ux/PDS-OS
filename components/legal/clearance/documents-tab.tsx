"use client";

import Link from "next/link";
import { useState } from "react";

import { NewContractButton } from "@/components/contracts/new-contract-button";
import { ContractProofSlot } from "@/components/legal/clearance/contract-proof-slot";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { isClosed, rightsOf } from "@/lib/legal/clearance/matrix";
import { advanceContract } from "@/lib/contracts/actions";
import { todayInParis } from "@/lib/contracts/types";
import { linkContract } from "@/lib/legal/clearance/terms-actions";
import type { Clearance } from "@/lib/legal/clearance/types";
import { contractStateTone } from "@/lib/ui/state-tones";

import { useLegalAction } from "@/components/legal/use-legal-action";

/** « Documents » : the contract of each concerned right, its signed copy and
 * its proof (kept in the Contracts module). With `organizationId` (the
 * « Signer » moment), they are dropped here, and a contract sent for
 * signature is marked signed here: the person never leaves the panel. */
export function DocumentsTab({
  projectId,
  clearance,
  projectContracts,
  organizationId = null,
}: {
  projectId: string;
  clearance: Clearance;
  projectContracts: Array<{ id: string; title: string }>;
  organizationId?: string | null;
}) {
  const s = fr.legalClearance.stages.sign;
  const t = fr.legalClearance;
  const rights = rightsOf(clearance.scope);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const { pending, run } = useLegalAction();
  if (clearance.scope === null)
    return (
      <p className="text-sm text-muted-foreground">{t.documents.noScope}</p>
    );
  if (clearance.scope === "none")
    return (
      <p className="text-sm text-muted-foreground">{t.documents.nothing}</p>
    );
  const closed = isClosed(clearance.status);

  return (
    <div className="flex flex-col gap-5">
      {rights.map((right) => {
        const contract = clearance.contracts.find((c) => c.right === right);
        return (
          <section key={right} className="flex flex-col gap-3">
            <h3 className="font-medium">{t.rights[right]}</h3>
            {contract ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">
                    {contract.title}
                  </span>
                  <StatusBadge
                    tone={contractStateTone[contract.state]}
                    size="sm"
                  >
                    {fr.contracts.states[contract.state]}
                  </StatusBadge>
                </div>
                {organizationId && !closed ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ContractProofSlot
                      organizationId={organizationId}
                      contractId={contract.id}
                      category="signed"
                      label={s.signedSlot}
                      hint={s.slotHint}
                      present={contract.signedFile}
                    />
                    <ContractProofSlot
                      organizationId={organizationId}
                      contractId={contract.id}
                      category="evidence"
                      label={s.evidenceSlot}
                      hint={s.evidenceHint}
                      present={contract.evidenceFile}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.documents.signed} :{" "}
                    {contract.signedFile
                      ? t.documents.present
                      : t.documents.absent}{" "}
                    · {t.documents.evidence} :{" "}
                    {contract.evidenceFile
                      ? t.documents.present
                      : t.documents.absent}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {organizationId && contract.state === "sent" && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          advanceContract({
                            contractId: contract.id,
                            action: "sign",
                            signedOn: todayInParis(new Date()),
                          }),
                        )
                      }
                    >
                      {s.markSigned}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={routes.contract(contract.id)} />}
                  >
                    {t.documents.open}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.documents.none}
              </p>
            )}
            {!closed && (
              <div className="flex flex-wrap items-end gap-2">
                {projectContracts.length > 0 && (
                  <>
                    <div className="min-w-56 flex-1">
                      <OptionSelect
                        name={`contract-${clearance.id}-${right}`}
                        label={t.documents.choose}
                        required
                        items={Object.fromEntries(
                          projectContracts.map((c) => [c.id, c.title]),
                        )}
                        defaultValue={contract?.id ?? null}
                        onValueChange={(value) =>
                          setChosen((all) => ({ ...all, [right]: value }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || !chosen[right]}
                      onClick={() =>
                        run(() =>
                          linkContract(
                            projectId,
                            clearance.id,
                            right,
                            chosen[right],
                          ),
                        )
                      }
                    >
                      {t.documents.link}
                    </Button>
                  </>
                )}
                <NewContractButton projectId={projectId} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
