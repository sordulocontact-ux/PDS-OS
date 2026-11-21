// « Caler le call » from a list of rows (the collective's recap, retours
// d'Ibé du 18/11/2026): what every row shares is read once
// (loadSharedNegotiationCall: the negotiators and their free slots, the
// Réseau's contacts, Meet), each row only says its target
// (NegotiationCallTarget), and negotiationCallData makes the
// NegotiationCallButton's data of one row — on the server or in the client,
// so the shared part crosses to the browser once. Pure, client-safe.

import type { CallContact } from "@/lib/calls/invite";
import {
  blankDealTerms,
  dealCallTitle,
  dealCallTopics,
} from "@/lib/deals/call-prep";
import type {
  CallNegotiator,
  NegotiationCallData,
} from "@/lib/deals/negotiation-call";
import { parseTermValue } from "@/lib/deals/term-format";
import {
  DEAL_TERMS,
  TERM_STATES,
  type DealTerm,
  type TermState,
} from "@/lib/deals/terms";
import type { DealStage } from "@/lib/deals/types";

/** What the rows of a list share for « Caler le call », read once. */
export type SharedNegotiationCall = {
  // Who a deal may be given to (list_deal_negotiators), with free slots:
  // offered when the row has no negotiator yet.
  negotiators: CallNegotiator[];
  // The negotiators of the rows' deals not in that list, with free slots.
  assignees: CallNegotiator[];
  contacts: CallContact[];
  googleMeet: boolean;
};

/** One row's « Caler le call »: on its deal, or on its participation when
 * it has none (the gesture opens the deal and gives it). */
export type NegotiationCallTarget = {
  target: { dealId: string } | { participationId: string };
  // « Jay · Titre de Jay (à nommer) »: the call's default title.
  name: string;
  // The deal's negotiator: the call is his. Null: chosen in the dialog.
  assigneeId: string | null;
  // The artist's manager, first among the guests to pick (null: none).
  contactId: string | null;
  // The call's agenda, one line a point (negotiationTopics).
  topics: string[];
};

const isTermState = (value: string): value is TermState =>
  (TERM_STATES as readonly string[]).includes(value);

/** A music deal's terms from their stored rows (as loadDealTerms, without
 * who changed them): every term in the configured order, « À définir »
 * when never written or unreadable. */
export function dealTermsOf(
  rows: ReadonlyArray<{ key: string; value: unknown; state: string }>,
): DealTerm[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return DEAL_TERMS.music.map((term): DealTerm => {
    const row = byKey.get(term.key);
    const value = row ? parseTermValue(term.format, row.value) : null;
    return {
      key: term.key,
      format: term.format,
      value,
      state:
        value !== null && row && isTermState(row.state)
          ? row.state
          : "to_define",
      changedBy: null,
      changedAt: null,
    };
  });
}

/** The call's agenda: the deal's stage and terms to negotiate, or, no deal
 * yet, every term to define (as loadParticipationNegotiationCall). */
export function negotiationTopics(
  deal: { stage: DealStage } | null,
  terms: ReadonlyArray<{ key: string; value: unknown; state: string }>,
): string[] {
  return deal
    ? dealCallTopics(deal, dealTermsOf(terms))
    : dealCallTopics({ stage: "to_contact" }, blankDealTerms());
}

/** The guests to pick from, the row's contact first. */
export function contactsFirst(
  contacts: readonly CallContact[],
  contactId: string | null,
): CallContact[] {
  if (!contactId) return [...contacts];
  return [
    ...contacts.filter((c) => c.contactId === contactId),
    ...contacts.filter((c) => c.contactId !== contactId),
  ];
}

/**
 * NegotiationCallButton's data for one row: its deal's negotiator (the call
 * is his), else every negotiator to choose from. Null when the deal's
 * negotiator was not read with the shared data (the button is not shown
 * rather than offering someone else).
 */
export function negotiationCallData(
  shared: SharedNegotiationCall,
  row: NegotiationCallTarget,
): NegotiationCallData | null {
  const assignee = row.assigneeId
    ? ([...shared.assignees, ...shared.negotiators].find(
        (n) => n.id === row.assigneeId,
      ) ?? null)
    : null;
  if (row.assigneeId && !assignee) return null;
  return {
    target: row.target,
    title: dealCallTitle(row.name),
    fixed: assignee !== null,
    negotiators: assignee ? [assignee] : shared.negotiators,
    contacts: contactsFirst(shared.contacts, row.contactId),
    googleMeet: shared.googleMeet,
    topics: row.topics,
  };
}
