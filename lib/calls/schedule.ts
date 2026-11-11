import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { CallErrorCode } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";
import {
  createMeetEvent,
  googleMeetConfigured,
} from "@/lib/integrations/google-calendar";
import { turnOnAutoTranscription } from "@/lib/integrations/google-meet";
import { withPrivateDetails } from "@/lib/network/private-details";
import type { Database } from "@/lib/supabase/database.types";

/**
 * A call planned like a Teams meeting (docs/ARCHITECTURE.md § 4 bis): a time
 * slot, members, Réseau contacts and typed addresses invited, and a Meet
 * link created by Google Calendar, which e-mails the invitations.
 */

type Client = SupabaseClient<Database>;

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

// The longest slot a call may take: a working day.
export const MAX_SLOT_MS = 12 * 60 * 60 * 1000;

export type Slot = { start: Date; end: Date };

/** The slot sent by the form (ISO instants, computed in the browser's zone). */
export function slotOf(
  form: FormData,
): { ok: true; slot: Slot } | { ok: false; error: CallErrorCode } {
  const start = new Date(text(form, "occurredAt"));
  const end = new Date(text(form, "endsAt"));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return { ok: false, error: "date_invalid" };
  const length = end.getTime() - start.getTime();
  if (length <= 0) return { ok: false, error: "end_before_start" };
  if (length > MAX_SLOT_MS) return { ok: false, error: "slot_too_long" };
  return { ok: true, slot: { start, end } };
}

export const guestsSchema = z
  .array(
    z.union([
      z.object({ contactId: z.uuid() }),
      z.object({ email: z.email().max(320) }),
    ]),
  )
  .max(50);

export type GuestInput = { contactId: string } | { email: string };

/** The guests picked in the form (a JSON list); null if invalid. */
export function guestsOf(form: FormData): GuestInput[] | null {
  try {
    const parsed = guestsSchema.safeParse(
      JSON.parse(text(form, "guests") || "[]"),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** "google": Google creates the Meet link; otherwise the pasted link. */
export function wantsGoogleMeet(form: FormData): boolean {
  return form.get("meet") === "google" && googleMeetConfigured();
}

export type Guest = {
  email: string;
  name: string | null;
  contactId: string | null;
};

/**
 * The guests outside the team, checked before the call is saved. A
 * contact's address is read from the Réseau with the user's session, never
 * taken from the browser; a contact without one cannot be invited.
 */
export async function resolveGuests(
  supabase: Client,
  input: GuestInput[],
): Promise<
  { ok: true; guests: Guest[] } | { ok: false; error: CallErrorCode }
> {
  const contactIds = input.flatMap((g) =>
    "contactId" in g ? [g.contactId] : [],
  );
  const { data: contacts, error } = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, name, email, private_owner_person_id")
        .in("id", contactIds)
    : { data: [], error: null };
  if (error) return { ok: false, error: "save_failed" };
  // A private contact's address for whoever may read it (BIZ 8); for anyone
  // else it has none, and cannot be invited.
  const { rows } = await withPrivateDetails(supabase, contacts ?? []);
  const byId = new Map(rows.map((c) => [c.id, c]));

  const guests = new Map<string, Guest>();
  for (const guest of input) {
    if ("contactId" in guest) {
      const contact = byId.get(guest.contactId);
      if (!contact?.email) return { ok: false, error: "guest_without_email" };
      const email = contact.email.trim().toLowerCase();
      guests.set(email, { email, name: contact.name, contactId: contact.id });
    } else {
      const email = guest.email.trim().toLowerCase();
      if (!guests.has(email))
        guests.set(email, { email, name: null, contactId: null });
    }
  }
  return { ok: true, guests: [...guests.values()] };
}

/** Writes the guests of a call just saved. */
export async function saveGuests(
  supabase: Client,
  input: { callId: string; organizationId: string; guests: Guest[] },
): Promise<void> {
  if (input.guests.length === 0) return;
  const { error } = await supabase.from("call_guests").insert(
    input.guests.map((g) => ({
      call_id: input.callId,
      organization_id: input.organizationId,
      email: g.email,
      name: g.name,
      contact_id: g.contactId,
    })),
  );
  if (error) console.error("[calls] invite guests failed:", error.message);
}

/**
 * Who a call's Google event invites: the members' addresses (read from
 * their fiche with the user's session), then the guests, each address once.
 */
export async function eventGuestsOf(
  supabase: Client,
  memberIds: string[],
  guests: Guest[],
): Promise<Array<{ email: string; name: string | null }>> {
  const { data: people } = memberIds.length
    ? await supabase
        .from("people")
        .select("email, first_name, last_name")
        .in("id", memberIds)
    : { data: [] };
  const invited = new Map<string, string | null>();
  for (const person of people ?? [])
    if (person.email)
      invited.set(
        person.email,
        [person.first_name, person.last_name].filter(Boolean).join(" "),
      );
  for (const guest of guests)
    if (!invited.has(guest.email)) invited.set(guest.email, guest.name);
  return [...invited].map(([email, name]) => ({ email, name }));
}

/**
 * Creates the Google Calendar event of a call already saved: its Meet link
 * and the invitations of the creator, the members and the guests. Returns
 * false when Google refused: the call stays, without a link, and its page
 * says so (the link can then be pasted by hand).
 */
export async function attachGoogleMeet(
  supabase: Client,
  input: {
    callId: string;
    title: string;
    slot: Slot;
    memberIds: string[];
    guests: Guest[];
    // What the invitation says (a prepared call: its objective, agenda and
    // documents); else one line.
    description?: string;
  },
): Promise<boolean> {
  try {
    const event = await createMeetEvent({
      requestId: input.callId,
      title: input.title,
      description: input.description ?? fr.calls.schedule.eventDescription,
      start: input.slot.start,
      end: input.slot.end,
      guests: await eventGuestsOf(supabase, input.memberIds, input.guests),
    });
    const { error } = await supabase
      .from("calls")
      .update({ meeting_url: event.meetUrl, google_event_id: event.eventId })
      .eq("id", input.callId);
    if (error) throw new Error(error.message);
    await transcribeMeet(event.meetUrl);
    return true;
  } catch (error) {
    console.error("[calls] google meet failed:", error);
    return false;
  }
}

/** Meet transcribes the call by itself (google-meet.ts). A refusal (token
 * without the Meet scope, Workspace edition that does not transcribe) never
 * costs the call its link: it is only logged. */
async function transcribeMeet(meetUrl: string): Promise<void> {
  try {
    await turnOnAutoTranscription(meetUrl);
  } catch (error) {
    console.warn("[calls] meet auto transcription not turned on:", error);
  }
}
