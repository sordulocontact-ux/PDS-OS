// Project-level facts of the État des lieux: the contracts attached to the
// project and the rights constraints of its Cadrage. Pure, built by code
// from rows already read (rule 6).

import { routes } from "@/lib/auth/redirects";
import {
  contractStateOf,
  type ContractState,
  type ContractStatus,
} from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import type { LegalFact, LegalFactStatus } from "@/lib/legal/types";

export type InventoryContract = {
  id: string;
  title: string;
  status: ContractStatus;
  endsOn: string | null;
  parties: string[];
  // Network contacts party to it: what a credit's contact is matched with.
  partyIds: string[];
  // Last change: since when a contract out for signature has been waiting.
  updatedAt: string;
};

export type InventoryFlag = {
  id: string;
  text: string;
  proposed: boolean;
};

const t = fr.legal.inventory;

// A signed contract settles; anything on its way is to confirm; an expired
// or terminated one no longer covers anything.
const CONTRACT_STATUS: Record<ContractState, LegalFactStatus> = {
  draft: "to_confirm",
  in_review: "to_confirm",
  approved: "to_confirm",
  sent: "to_confirm",
  signed: "known",
  expired: "missing",
  terminated: "missing",
};

export function agreementFacts(
  contracts: InventoryContract[],
  today: string,
): LegalFact[] {
  if (contracts.length === 0)
    return [
      {
        key: "no-contract",
        label: t.facts.noContract,
        detail: null,
        source: t.sources.contracts,
        status: "missing",
        statusLabel: t.states.noContract,
        href: routes.contracts,
      },
    ];
  return contracts.map((contract) => {
    const state = contractStateOf(contract, today);
    return {
      key: `contract-${contract.id}`,
      label: contract.title,
      detail: contract.parties.length > 0 ? contract.parties.join(", ") : null,
      source: t.sources.contracts,
      status: CONTRACT_STATUS[state],
      statusLabel: fr.contracts.states[state],
      href: routes.contract(contract.id),
    };
  });
}
/** A rights constraint of the Cadrage is a point to check, never settled. */
export function flagFacts(
  projectId: string,
  flags: InventoryFlag[],
): LegalFact[] {
  return flags.map((flag) => ({
    key: `flag-${flag.id}`,
    label: flag.text,
    detail: null,
    source: t.sources.framing,
    status: "to_confirm",
    statusLabel: flag.proposed ? t.states.flaggedProposed : t.states.flagged,
    href: routes.projectFramingStep(projectId, "legal"),
  }));
}
