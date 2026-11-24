import { isMine, type ContractNowKind } from "@/lib/contracts/now";
import type { ContractDetail } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { formatDate } from "@/lib/release/format";

// The line « Maintenant » says of a contract (its page, its side sheet):
// what it asks of the viewer, who it waits for and to do what, or how it
// ended. Client-safe, pure.

const t = contracts.now;

export function contractNowTitle({
  kind,
  contract,
  directionName,
  signerName,
  viaLink,
}: {
  kind: ContractNowKind;
  contract: Pick<
    ContractDetail,
    | "state"
    | "reviewComment"
    | "reviewerName"
    | "ownerName"
    | "signedOn"
    | "endsOn"
  >;
  // Who decides and signs for PDS; who signs for the other party.
  directionName: string | null;
  signerName: string | null;
  // Sent on the party's private link.
  viaLink: boolean;
}): string {
  const direction = directionName ?? t.direction;
  const signer = signerName ?? t.theParty;
  const waitOf: Partial<Record<ContractNowKind, [string, string, boolean]>> = {
    await_decide: [direction, t.todos.decide, false],
    await_submit: [contract.ownerName, t.todos.submit, false],
    await_send: [contract.ownerName, t.todos.send, false],
    await_signer: [signer, t.todos.signer, viaLink],
    await_countersign: [direction, t.todos.countersign, false],
    await_mark_signed: [contract.ownerName, t.todos.mark_signed, false],
  };
  const wait = waitOf[kind];
  const changesAsked =
    contract.state === "draft" &&
    Boolean(contract.reviewComment && contract.reviewerName);
  if (isMine(kind))
    return kind === "submit" && changesAsked
      ? t.titles.resubmit
      : t.titles[kind as keyof typeof t.titles];
  if (wait) return t.waiting(...wait);
  if (kind === "signed")
    return t.signedTitle(
      contract.signedOn ? formatDate(contract.signedOn) : "",
    );
  if (kind === "expired")
    return t.expiredTitle(contract.endsOn ? formatDate(contract.endsOn) : "");
  return t.terminatedTitle;
}
