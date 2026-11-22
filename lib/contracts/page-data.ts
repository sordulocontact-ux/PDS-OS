import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { siteUrl } from "@/lib/auth/site-url";
import { listCatalogFiles } from "@/lib/catalog/files";
import { loadContractJournal } from "@/lib/contracts/journal";
import { legalOriginOf } from "@/lib/contracts/legal-origin";
import { contractNowOf } from "@/lib/contracts/now";
import { contractProofOf } from "@/lib/contracts/proof";
import type { ContractDetail, ContractParty } from "@/lib/contracts/types";
import { loadContractCards } from "@/lib/legal/contracts/document-card";
import { getContractDocument } from "@/lib/legal/contracts/document";
import { loadDirectionPerson } from "@/lib/master-workflow/journey-context";
import { personName } from "@/lib/projects/types";
import { loadContactLinks } from "@/lib/portal/contact-links";

// Everything a contract's page shows (proto « Contrats », 29/10/2026), read
// at once: its document and what changed, its proof of sending and of
// signature, its journal, where it comes from in the Juridique, who signs
// it and their private link, the direction, and « Maintenant ».

export type ContractSigner = ContractParty & {
  // Their page by project (/c/…), when the contract comes from the
  // Juridique: absolute URL for the project's owner only.
  link: { url: string | null; openedAt: string | null } | null;
};

export async function loadContractPage(
  contract: ContractDetail,
  access: Access,
) {
  const owner = { kind: "contract" as const, id: contract.id };
  const [library, document, origin, proofs, journal, cards, direction] =
    await Promise.all([
      listCatalogFiles(owner),
      getContractDocument(contract.id),
      legalOriginOf(contract.id),
      contractProofOf([contract.id]),
      loadContractJournal(contract.id),
      loadContractCards([contract.id]),
      loadDirectionPerson(),
    ]);
  const proof = proofs.get(contract.id) ?? null;
  const generated = document !== null;

  // Who signs: the person of the Juridique's agreement, else the first party.
  const agreementContact =
    origin?.kind === "agreement" ? origin.contactId : null;
  const party =
    contract.partyList.find((p) => p.contactId === agreementContact) ??
    contract.partyList[0] ??
    null;
  const links =
    origin?.kind === "agreement" && party
      ? await loadContactLinks(origin.projectId)
      : null;
  const link =
    links?.rows.find((r) => r.contactId === party?.contactId)?.link ?? null;
  const signer: ContractSigner | null = party && {
    ...party,
    link: link && {
      url: link.path ? `${siteUrl()}${link.path}` : null,
      openedAt: link.openedAt,
    },
  };

  const returned = generated
    ? Boolean(proof?.deposit || (proof?.signed && proof.evidence))
    : Boolean(proof?.signed);
  // Signing for PDS stays the direction's (« validate »); validating the
  // contract is validate_contracts (contract.can.decide).
  const canValidate = can(access, "validate");
  const now = contractNowOf({
    state: contract.state,
    can: contract.can,
    canCountersign: canValidate,
    generated,
    returned,
    countersigned: Boolean(proof?.countersign),
    documented:
      generated ||
      library.files.some((f) =>
        ["draft", "signed", "pds_signed"].includes(f.category),
      ),
  });
  // Who sent it: the last « Envoyé en signature » of the journal.
  const sentBy = journal.find((e) => e.kind === "signature.requested")?.by;

  return {
    library,
    document,
    card: cards[contract.id] ?? null,
    origin,
    proof,
    journal,
    signer,
    now,
    canValidate,
    sentBy: sentBy ?? "",
    direction: direction?.name ?? null,
    me: personName(access.firstName, access.lastName),
  };
}

export type ContractPageData = Awaited<ReturnType<typeof loadContractPage>>;
