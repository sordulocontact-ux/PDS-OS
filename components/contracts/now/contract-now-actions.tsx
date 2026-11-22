import { ContractDepositButton } from "@/components/contracts/contract-deposit-button";
import { ContractAdvanceButton } from "@/components/contracts/now/contract-advance-button";
import { ContractCountersignDialog } from "@/components/contracts/now/contract-countersign-dialog";
import { ContractDecision } from "@/components/contracts/now/contract-decision";
import { ContractRemindDialog } from "@/components/contracts/now/contract-remind-dialog";
import { ContractSendDialog } from "@/components/contracts/now/contract-send-dialog";
import { ContractSignStep } from "@/components/contracts/now/contract-sign-step";
import { ContractTerminateButton } from "@/components/contracts/now/contract-terminate-button";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DocumentCard } from "@/components/ui/document-card";
import { Fold } from "@/components/ui/fold";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { emailEnabled } from "@/lib/email/send";
import { contractMails } from "@/lib/contracts/mail";
import type { ContractPageData } from "@/lib/contracts/page-data";
import { todayInParis, type ContractDetail } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { formatShortDay } from "@/lib/utils/day";

const fr = { contracts, signedReturns };

/** The gestures of a contract's « Maintenant », for its kind. */
export function ContractNowActions({
  contract,
  data,
}: {
  contract: ContractDetail;
  data: ContractPageData;
}) {
  const t = fr.contracts.now;
  const team = fr.signedReturns.team;
  const { now: kind, signer, proof, document } = data;
  const generated = document !== null;
  const person = signer?.name ?? t.theParty;
  const direction = data.direction ?? t.direction;
  const link = signer?.link?.url ?? null;
  // E-mailed by PDS OS itself: SMTP set, the signer's address, their link.
  const smtp = emailEnabled();
  const auto = smtp && !!signer?.email && link !== null;
  const mails = contractMails({
    title: contract.title,
    dueOn: contract.dueOn,
    signer,
    link,
    me: data.me,
  });
  const version = data.card?.version ?? document?.latest.version ?? null;
  const fileName =
    version !== null
      ? documentFileName(t.send.fileName(contract.title, version))
      : null;
  // The generated document, to attach to the e-mail.
  const attachment = fileName && (
    <>
      <b className="font-semibold break-all">{fileName}</b>
      <PdfExportButton
        href={routes.contractDocumentPdf(contract.id)}
        fileName={fileName}
        label={t.send.pdf}
        pendingLabel={t.send.pdfPending}
        failedLabel={t.send.pdfFailed}
        variant="outline"
        size="sm"
      />
    </>
  );
  const deposit = proof?.deposit;
  const backOn = deposit
    ? todayInParis(new Date(deposit.at))
    : todayInParis(new Date());
  const signStep = (mode: "gate" | "otherwise") => (
    <ContractSignStep
      contractId={contract.id}
      mode={mode}
      generated={generated}
      person={person}
      organizationId={contract.organizationId}
      proof={proof}
      canCountersign={data.canValidate}
      direction={direction}
      signedOn={backOn}
    />
  );
  // Back signed outside the link, or already signed (a contract by hand).
  const otherwise = contract.can.sign && (
    <Fold summary={generated ? team.otherwise : t.signedBack}>
      {signStep("otherwise")}
    </Fold>
  );

  // Read before deciding, submitting or sending (Sacha 22/11/2026).
  const read = data.pdf && (
    <div>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={data.pdf} target="_blank" rel="noreferrer" />}
      >
        {t.openPdf}
      </Button>
    </div>
  );
  switch (kind) {
    case "deposit":
      return (
        <div>
          <ContractDepositButton
            organizationId={contract.organizationId}
            contractId={contract.id}
            size="lg"
          />
        </div>
      );
    case "decide":
      return (
        <>
          {read}
          <ContractDecision contractId={contract.id} />
        </>
      );
    case "submit":
      return (
        <>
          {read}
          <ContractAdvanceButton
            contractId={contract.id}
            action="submit"
            label={t.submit}
          />
        </>
      );
    case "send":
      return (
        <>
          <div>
            <ContractSendDialog
              contractId={contract.id}
              projectId={contract.projectId}
              mail={{
                ...mails.send,
                attachment,
                viaLink: signer?.link != null,
                auto,
                smtp,
              }}
            />
          </div>
          {!generated && otherwise}
        </>
      );
    case "await_signer":
      return (
        <>
          {(contract.can.sign || link) && (
            <div className="flex flex-wrap gap-2">
              {contract.can.sign && (
                <ContractRemindDialog
                  name={person}
                  contractId={contract.id}
                  projectId={contract.projectId}
                  mail={{ ...mails.remind, attachment, auto, smtp }}
                />
              )}
              {link && (
                <CopyButton
                  value={link}
                  label={t.copyLink}
                  copiedLabel={t.linkCopied}
                  variant="ghost"
                />
              )}
            </div>
          )}
          {otherwise}
        </>
      );
    case "countersign":
      return (
        <div>
          <ContractCountersignDialog
            contractId={contract.id}
            organizationId={contract.organizationId}
            pdsSigned={Boolean(proof?.pdsSigned)}
            person={person}
            version={version}
            canSign={contract.can.sign}
            signedOn={backOn}
            document={
              deposit && (
                <DocumentCard
                  name={deposit.fileName}
                  line={team.depositedBy(
                    person,
                    formatShortDay(deposit.at, { bare: true }),
                  )}
                  action={
                    deposit.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={deposit.url}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        {team.viewPdf}
                      </Button>
                    )
                  }
                />
              )
            }
          />
        </div>
      );
    case "mark_signed":
      return signStep("gate");
    case "signed":
      return contract.can.terminate ? (
        <ContractTerminateButton contractId={contract.id} />
      ) : null;
    default:
      return null;
  }
}
