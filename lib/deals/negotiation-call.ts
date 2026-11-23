import "server-only";

import {
  loadNegotiatorFreeDays,
  monthEnd,
  type FreeDay,
} from "@/lib/calendar/free-slots";
import { loadCallContacts, type CallContact } from "@/lib/calls/invite";
import {
  blankDealTerms,
  dealCallTitle,
  dealCallTopics,
} from "@/lib/deals/call-prep";
import { loadCallGuests } from "@/lib/deals/call-guests";
import { dealName } from "@/lib/deals/names";
import {
  contactsFirst as orderContacts,
  type SharedNegotiationCall,
} from "@/lib/deals/negotiation-call-rules";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { todayInParis } from "@/lib/insights/dates";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { personName } from "@/lib/projects/types";
import { addMonths, monthOf } from "@/lib/utils/date-input";
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
  // The Réseau contacts invited by default (pickCallGuests).
  guests: string[];
  googleMeet: boolean;
  // The agenda the call will have, one line a point (dealCallTopics).
  topics: string[];
};

/** Members who may hold a call, with their free slots (this month and the
 * next). */
export async function withSlots(
  people: { id: string; name: string }[],
): Promise<CallNegotiator[]> {
  const today = todayInParis();
  return Promise.all(
    people.map(async (p) => ({
      ...p,
      // This month and the next; the calendar reads the others when shown.
      ...(await loadNegotiatorFreeDays(p.id, {
        from: today,
        to: monthEnd(addMonths(monthOf(today), 1)),
      })),
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
  return orderContacts(await loadCallContacts(), contactId);
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
  const [negotiators, contacts, guests] = await Promise.all([
    withSlots(people),
    contactsFirst(
      deal.participationId
        ? await participationContact(deal.participationId)
        : null,
    ),
    loadCallGuests({
      dealId: deal.id,
      participationId: deal.participationId,
      artistId: deal.artistId,
      counterpartId: deal.counterpartId,
    }),
  ]);
  return {
    target: { dealId: deal.id },
    title: dealCallTitle(dealName(deal)),
    fixed: deal.assignee !== null,
    negotiators,
    contacts,
    guests,
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
  artistId: string | null = null,
): Promise<NegotiationCallData> {
  const [negotiators, contacts, guests] = await Promise.all([
    negotiatorsOf().then(withSlots),
    participationContact(participationId).then(contactsFirst),
    loadCallGuests({
      dealId: null,
      participationId,
      artistId,
      counterpartId: null,
    }),
  ]);
  return {
    target: { participationId },
    title: dealCallTitle(name),
    fixed: false,
    negotiators,
    contacts,
    guests,
    googleMeet: googleMeetConfigured(),
    topics: dealCallTopics({ stage: "to_contact" }, blankDealTerms()),
  };
}

/**
 * What every row of a list shares for « Caler le call » (the collective's
 * recap, retours d'Ibé du 18/11/2026), read once rather than per row: the
 * negotiators a deal may be given to and the negotiators of the rows' deals
 * (`assigneeIds`), each with his free slots, and the Réseau's contacts. Each
 * row's data: negotiationCallData (lib/deals/negotiation-call-rules.ts).
 * Call it only when a row may plan its call (participation_deal_state's
 * `can_plan_call`).
 */
export async function loadSharedNegotiationCall(
  assignees: ReadonlyArray<{ id: string; name: string }>,
): Promise<SharedNegotiationCall> {
  const [people, contacts] = await Promise.all([
    negotiatorsOf(),
    loadCallContacts(),
  ]);
  const listed = new Set(people.map((p) => p.id));
  const others = [
    ...new Map(
      assignees.filter((a) => !listed.has(a.id)).map((a) => [a.id, a]),
    ).values(),
  ];
  const [negotiators, extra] = await Promise.all([
    withSlots(people),
    withSlots(others),
  ]);
  return {
    negotiators,
    assignees: extra,
    contacts,
    googleMeet: googleMeetConfigured(),
  };
}
