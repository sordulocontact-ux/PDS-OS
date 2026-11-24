import { ContractNowFrame } from "@/components/contracts/now/contract-now-frame";
import { ReturnCallout } from "@/components/ui/return-callout";
import type { ContractPageData } from "@/lib/contracts/page-data";
import { isMine } from "@/lib/contracts/now";
import { contractNowTitle } from "@/lib/contracts/now-title";
import type { ContractDetail } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { formatDate } from "@/lib/release/format";
import { contractStateTone } from "@/lib/ui/state-tones";

import { ContractNowActions } from "./contract-now-actions";

const fr = { contracts, legalDocuments };
const team = signedReturns.team;

/**
 * « Maintenant » of a contract (proto « Contrats », 29/10/2026), by role
 * and state: the direction validates or asks for changes; the owner submits
 * it (the direction's return in head), sends it for signature, reminds the
 * party; the direction signs for PDS once it came back signed; then the
 * neutral state. Who is awaited otherwise, and the facts of the step.
 */
export function ContractNow({
  contract,
  data,
}: {
  contract: ContractDetail;
  data: ContractPageData;
}) {
  const t = fr.contracts.now;
  const { now: kind, signer, proof, direction } = data;
  const mine = isMine(kind);
  const ended =
    kind === "signed" || kind === "expired" || kind === "terminated";
  const title = contractNowTitle({
    kind,
    contract,
    directionName: direction,
    signerName: signer?.name ?? null,
    viaLink: proof?.sent?.via === "link",
  });
  const directionName = direction ?? t.direction;
  const signerName = signer?.name ?? t.theParty;
  const changesAsked =
    contract.state === "draft" &&
    contract.reviewComment &&
    contract.reviewerName;

  const sent = proof?.sent;
  const f = t.facts;
  const facts: Array<[string, string] | null> =
    kind === "decide"
      ? [[f.then, data.mine ? f.thenSendYou : f.thenSend(contract.ownerName)]]
      : kind === "submit"
        ? [[f.validation, directionName]]
        : kind === "send"
          ? [
              [
                f.sentTo,
                signer ? f.sentToValue(signer.name, signer.email) : f.noParty,
              ],
            ]
          : [];

  // The signed copy came back: from whom, how and when, in one line (Sacha
  // 23/11/2026: « on ne sait pas qu'on vient de recevoir le mail »).
  const back = proof?.deposit;
  const returnedLine =
    back &&
    (kind === "mark_signed" ||
      kind === "await_mark_signed" ||
      kind === "countersign" ||
      kind === "await_countersign")
      ? (back.byEmail ? team.emailedBy : team.depositedBy)(
          signerName,
          formatDate(back.at),
        )
      : null;
  // Sent: when, by whom and how, in one line (Sacha 22/11/2026).
  const line =
    returnedLine ??
    (kind === "await_signer" && sent
      ? sent.via === "link"
        ? f.linkLine(
            formatDate(sent.on),
            signer?.link?.openedAt ? formatDate(signer.link.openedAt) : null,
          )
        : f.sentLine(
            formatDate(sent.on),
            data.sentBy ?? "",
            sent.how ? (f.hows[sent.how] ?? sent.how.toLowerCase()) : "",
          )
      : null);

  return (
    <>
      {changesAsked && (
        <ReturnCallout
          by={contract.reviewerName ?? ""}
          outcome={fr.legalDocuments.contract.returnVerb}
          note={contract.reviewComment ?? ""}
        />
      )}
      <ContractNowFrame
        badge={
          ended
            ? {
                tone: contractStateTone[contract.state],
                label: fr.contracts.states[contract.state],
              }
            : mine
              ? { tone: "info", label: t.mine }
              : kind === "await_signer" && contract.can.sign
                ? { tone: "neutral", label: t.awaiting }
                : { tone: "neutral", label: t.nothing }
        }
        validate={kind === "decide"}
        eyebrow={contract.title}
        title={title}
        line={line}
        // The copy that came back, opened from where it is said (Sacha
        // 23/11/2026: « le contrat dans la card alors »).
        lineLink={
          returnedLine && back?.url
            ? { href: back.url, label: team.viewPdf }
            : null
        }
        facts={facts}
      >
        <ContractNowActions contract={contract} data={data} />
      </ContractNowFrame>
    </>
  );
}
