import { ContractNowFrame } from "@/components/contracts/now/contract-now-frame";
import { ReturnCallout } from "@/components/ui/return-callout";
import type { ContractPageData } from "@/lib/contracts/page-data";
import { isMine, type ContractNowKind } from "@/lib/contracts/now";
import type { ContractDetail } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { formatDate } from "@/lib/release/format";
import { contractStateTone } from "@/lib/ui/state-tones";

import { ContractNowActions } from "./contract-now-actions";

const fr = { contracts, legalDocuments };

const WHY: Record<ContractNowKind, keyof typeof fr.contracts.now.why> = {
  decide: "in_review",
  await_decide: "in_review",
  submit: "draft",
  await_submit: "draft",
  send: "approved",
  await_send: "approved",
  await_signer: "sent",
  countersign: "returned",
  await_countersign: "returned",
  mark_signed: "mark_signed",
  await_mark_signed: "mark_signed",
  signed: "signed",
  expired: "expired",
  terminated: "terminated",
};

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
  const directionName = direction ?? t.direction;
  const signerName = signer?.name ?? t.theParty;
  const changesAsked =
    contract.state === "draft" &&
    contract.reviewComment &&
    contract.reviewerName;

  const waitOf: Partial<Record<ContractNowKind, [string, string, boolean]>> = {
    await_decide: [directionName, t.todos.decide, false],
    await_submit: [contract.ownerName, t.todos.submit, false],
    await_send: [contract.ownerName, t.todos.send, false],
    await_signer: [signerName, t.todos.signer, proof?.sent?.via === "link"],
    await_countersign: [directionName, t.todos.countersign, false],
    await_mark_signed: [contract.ownerName, t.todos.mark_signed, false],
  };
  const wait = waitOf[kind];
  const mine = isMine(kind);
  const ended =
    kind === "signed" || kind === "expired" || kind === "terminated";

  const title = mine
    ? kind === "submit" && changesAsked
      ? t.titles.resubmit
      : t.titles[kind as keyof typeof t.titles]
    : wait
      ? t.waiting(...wait)
      : kind === "signed"
        ? t.signedTitle(contract.signedOn ? formatDate(contract.signedOn) : "")
        : kind === "expired"
          ? t.expiredTitle(contract.endsOn ? formatDate(contract.endsOn) : "")
          : t.terminatedTitle;

  const sent = proof?.sent;
  const f = t.facts;
  const facts: Array<[string, string] | null> =
    kind === "decide"
      ? [[f.then, f.thenSend(contract.ownerName)]]
      : kind === "submit"
        ? [[f.validation, directionName]]
        : kind === "send"
          ? [
              [
                f.sentTo,
                signer ? f.sentToValue(signer.name, signer.email) : f.noParty,
              ],
            ]
          : kind === "await_signer" && sent
            ? [
                [f.sentOn, f.sentOnValue(formatDate(sent.on), data.sentBy)],
                sent.via === "other" && sent.how ? [f.how, sent.how] : null,
                sent.via === "link"
                  ? [
                      f.opened,
                      signer?.link?.openedAt
                        ? formatDate(signer.link.openedAt)
                        : f.notOpened,
                    ]
                  : null,
              ]
            : [];

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
              : { tone: "neutral", label: t.nothing }
        }
        validate={kind === "decide"}
        eyebrow={contract.title}
        title={title}
        why={t.why[WHY[kind]]}
        facts={facts}
      >
        <ContractNowActions contract={contract} data={data} />
      </ContractNowFrame>
    </>
  );
}
