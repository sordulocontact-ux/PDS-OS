import "server-only";

import {
  loadNegotiatorFreeDays,
  type FreeDay,
} from "@/lib/calendar/free-slots";
import { loadCallContacts, type CallContact } from "@/lib/calls/invite";
import {
  blankDealTerms,
  dealCallTitle,
  dealCallTopics,
} from "@/lib/deals/call-prep";
import { dealName } from "@/lib/deals/names";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** A member who may hold the call, with his free slots. */
export type CallNegotiator = {
  id: string;
  name: string;
  days: FreeDay[];
  // His slots could not be read: said, never shown as « no slot ».
  error: boolean;
};

/** What « Caler le call » needs, read by the server (client-safe shape). */
export type NegotiationCallData = {
  // The deal, or the participation whose deal the gesture opens.
  target: { dealId: string } | { participationId: string };
  title: string;
  // The deal's negotiator: the call is his. None yet: `negotiators` to
  // choose from (the deal is given to him by the same gesture).
  fixed: boolean;
  negotiators: CallNegotiator[];
  contacts: CallContact[];
  googleMeet: boolean;
  // The agenda the call will have, one line a point (dealCallTopics).
  topics: string[];
};

async function withSlots(
  people: { id: string; name: string }[],
): Promise<CallNegotiator[]> {
  return Promise.all(
    people.map(async (p) => ({
      ...p,
      ...(await loadNegotiatorFreeDays(p.id)),
    })),
  );
}

/** The members a deal may be given to (list_deal_negotiators). */
async function negotiatorsOf(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_deal_negotiators");
  if (error) console.error("negotiatorsOf:", error.message);
  return (data ?? []).map((n) => ({
    id: n.person_id,
    name: personName(n.first_name, n.last_name),
  }));
}

/** The guests to pick from, the participation's contact first. */
async function contactsFirst(contactId: string | null): Promise<CallContact[]> {
  const contacts = await loadCallContacts();
  if (!contactId) return contacts;
  return [
    ...contacts.filter((c) => c.contactId === contactId),
    ...contacts.filter((c) => c.contactId !== contactId),
  ];
}

/** The participation's contact (the artist's manager, if noted). */
async function participationContact(
  participationId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("title_participations")
    .select("contact_id")
    .eq("id", participationId)
    .maybeSingle();
  return data?.contact_id ?? null;
}

/**
 * « Caler le call » of a deal (Ibé 18/11/2026), for the project's owner who
 * reads it (`deal.canPlanCall`): its negotiator's free slots, else every
 * negotiator's to choose from; null for anyone else.
 */
export async function loadDealNegotiationCall(
  deal: Deal,
  terms: DealTerm[],
): Promise<NegotiationCallData | null> {
  if (!deal.canPlanCall) return null;
  const people = deal.assignee ? [deal.assignee] : await negotiatorsOf();
  const [negotiators, contacts] = await Promise.all([
    withSlots(people),
    contactsFirst(
      deal.participationId
        ? await participationContact(deal.participationId)
        : null,
    ),
  ]);
  return {
    target: { dealId: deal.id },
    title: dealCallTitle(dealName(deal)),
    fixed: deal.assignee !== null,
    negotiators,
    contacts,
    googleMeet: googleMeetConfigured(),
    topics: dealCallTopics(deal, terms),
  };
}

/**
 * « Caler le call » on a participation that has no live deal yet (the
 * « Titres et artistes » board): the gesture opens its deal, given to the
 * negotiator chosen. `name`: the artist's name, for the call's title. Call
 * it only when participation_deal_state says `can_plan_call` with no deal.
 */
export async function loadParticipationNegotiationCall(
  participationId: string,
  name: string,
): Promise<NegotiationCallData> {
  const [negotiators, contacts] = await Promise.all([
    negotiatorsOf().then(withSlots),
    participationContact(participationId).then(contactsFirst),
  ]);
  return {
    target: { participationId },
    title: dealCallTitle(name),
    fixed: false,
    negotiators,
    contacts,
    googleMeet: googleMeetConfigured(),
    topics: dealCallTopics({ stage: "to_contact" }, blankDealTerms()),
  };
}
