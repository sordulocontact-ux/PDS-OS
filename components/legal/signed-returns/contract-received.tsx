"use client";

import { SignatureGate } from "@/components/legal/signed-returns/signature-gate";
import { StepSection } from "@/components/shell/journey/step-section";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ContractProof } from "@/lib/contracts/proof";
import { todayInParis } from "@/lib/contracts/types";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

const fr = { signedReturns };

const t = fr.signedReturns.team;

/**
 * « Reçu de … par son lien privé » (proto Juridique v3, JUR-11): the signed
 * copy the person deposited, then « Vérification de la signature » — the
 * version signed, the signer, PDS's signature by the direction (habilitée)
 * and the signature devices. The direction signs for PDS here (« Signer le
 * contrat pour PDS »); the team then ticks that it checked the signature
 * and marks it signed — dated the day of the deposit. A confirmation in PDS
 * OS is never a signature.
 */
export function ContractReceived({
  contractId,
  organizationId,
  proof,
  person,
  deposit,
  version,
  countersign,
  canCountersign,
  direction,
  pending,
  onCountersign,
  onSign,
  extra,
}: {
  contractId: string;
  organizationId: string | null;
  proof: ContractProof | null;
  person: string;
  deposit: NonNullable<ContractProof["deposit"]>;
  // The version validated by the direction and sent.
  version: number | null;
  countersign: ContractProof["countersign"];
  // The viewer may sign for PDS (the direction).
  canCountersign: boolean;
  direction: string;
  pending: boolean;
  onCountersign: () => void;
  onSign: (signedOn: string, checked: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    // Its own sections start a new part of the step: 28 px above, as
    // between sections (8 px of the step's section + 20), whatever wraps it
    // (Sacha, 06/11/2026: « pourquoi si peu de gap »).
    <div className="mt-5 flex flex-col gap-3.5 modern:gap-4">
      <StepSection
        title={(deposit.byEmail ? t.receivedByEmail : t.received)(person)}
      >
        <FactRows>
          <FactRow
            label={t.signedFile}
            value={
              <b className="font-semibold break-all">{deposit.fileName}</b>
            }
            source={(deposit.byEmail ? t.emailedBy : t.depositedBy)(
              person,
              formatShortDay(deposit.at, { bare: true }),
            )}
            side={
              deposit.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a href={deposit.url} target="_blank" rel="noreferrer" />
                  }
                >
                  {t.viewPdf}
                </Button>
              )
            }
          />
        </FactRows>
      </StepSection>
      <StepSection title={t.checkTitle}>
        <FactRows>
          {version !== null && (
            <FactRow
              label={t.checkVersion}
              value={t.checkVersionValue(version)}
            />
          )}
          <FactRow label={t.checkSigner} value={t.checkSignerValue(person)} />
          <FactRow
            label={t.checkPds}
            value={
              countersign
                ? t.checkPdsDone(
                    countersign.by ?? direction,
                    formatShortInstant(countersign.at),
                  )
                : t.checkPdsMissing(direction)
            }
            side={
              <StatusBadge tone={countersign ? "success" : "danger"} size="sm">
                {countersign ? t.countersigned : t.countersign}
              </StatusBadge>
            }
          />
          <FactRow label={t.checkDevices} value={t.checkDevicesValue(person)} />
        </FactRows>
      </StepSection>
      <SignatureGate
        contractId={contractId}
        organizationId={organizationId}
        proof={proof}
        person={person}
        countersign={countersign}
        canCountersign={canCountersign}
        direction={direction}
        pending={pending}
        onCountersign={onCountersign}
        onSign={() => onSign(todayInParis(new Date(deposit.at)), true)}
        extra={extra}
      />
    </div>
  );
}
