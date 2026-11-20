"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type { ActionResult, CallErrorCode } from "@/lib/calls/constants";
import { meetingUrlSchema } from "@/lib/calls/plan-call";
import {
  eventGuestsOf,
  guestsOf,
  resolveGuests,
  slotOf,
  wantsGoogleMeet,
} from "@/lib/calls/schedule";
import { dealCallAgenda } from "@/lib/deals/call-prep";
import { loadDeal } from "@/lib/deals/queries";
import { loadDealTerms } from "@/lib/deals/term-queries";
import { DEAL_TERMS, type DealTerm } from "@/lib/deals/terms";
import { schedule } from "@/lib/i18n/fr/calls-schedule";
import { createMeetEvent } from "@/lib/integrations/google-calendar";
import { turnOnAutoTranscription } from "@/lib/integrations/google-meet";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// plan_deal_negotiation_call's exceptions, in the call form's words.
const ERRORS: Record<string, CallErrorCode> = {
  title_required: "title_required",
  invalid_slot: "date_invalid",
  link_invalid: "link_invalid",
  deal_not_found: "not_found",
  participation_not_found: "not_found",
};

const targetSchema = z.object({
  dealId: z.uuid().optional(),
  participationId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
});

const field = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim() || undefined;

/** A participation's deal does not exist yet: its terms all to define. */
const blankTerms = (): DealTerm[] =>
  DEAL_TERMS.music.map((term) => ({
    key: term.key,
    format: term.format,
    value: null,
    state: "to_define",
    changedBy: null,
    changedAt: null,
  }));

/** The Meet event of the call, inviting its negotiator and guests (never
 * whoever planned it: she is not in the call). A refusal keeps the call. */
async function attachMeet(input: {
  callId: string;
  title: string;
  slot: { start: Date; end: Date };
  negotiatorId: string | null;
  guests: Awaited<ReturnType<typeof resolveGuests>>;
}): Promise<void> {
  if (!input.guests.ok) return;
  const supabase = await createClient();
  try {
    const event = await createMeetEvent({
      requestId: input.callId,
      title: input.title,
      description: schedule.eventDescription,
      start: input.slot.start,
      end: input.slot.end,
      guests: await eventGuestsOf(
        supabase,
        input.negotiatorId ? [input.negotiatorId] : [],
        input.guests.guests,
      ),
    });
    const { error } = await supabase.rpc("set_deal_negotiation_call_link", {
      p_call_id: input.callId,
      p_meeting_url: event.meetUrl,
      p_google_event_id: event.eventId,
    });
    if (error) throw new Error(error.message);
    await turnOnAutoTranscription(event.meetUrl).catch((e: unknown) =>
      console.warn("[deals] meet auto transcription not turned on:", e),
    );
  } catch (error) {
    console.error("[deals] negotiation call meet failed:", error);
  }
}

/**
 * « Caler le call » (Ibé 18/11/2026): the project's owner plans the call
 * of negotiation between the deal's negotiator and the artist's side, on a
 * deal or on a participation without one (its deal opened and given by the
 * same gesture). The database decides who may and writes the call, its
 * guests, the deal's stage (plan_deal_negotiation_call); the page stays.
 */
export async function planNegotiationCall(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId)
    return { ok: false, error: "unauthorized" };
  const target = targetSchema.safeParse({
    dealId: field(form, "dealId"),
    participationId: field(form, "participationId"),
    assigneeId: field(form, "assigneeId"),
  });
  if (!target.success || !target.data.dealId === !target.data.participationId)
    return { ok: false, error: "invalid_input" };
  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  const slot = slotOf(form);
  if (!slot.ok) return slot;
  const google = wantsGoogleMeet(form);
  const url = google
    ? null
    : meetingUrlSchema.safeParse(String(form.get("meetingUrl") ?? ""));
  if (url && !url.success) return { ok: false, error: "link_invalid" };
  const guestInput = guestsOf(form);
  if (!guestInput) return { ok: false, error: "guest_email_invalid" };
  const supabase = await createClient();
  const guests = await resolveGuests(supabase, guestInput);
  if (!guests.ok) return guests;

  const { dealId, participationId, assigneeId } = target.data;
  const deal = dealId ? await loadDeal(access, dealId) : null;
  if (dealId && !deal) return { ok: false, error: "not_found" };
  const agenda = deal
    ? dealCallAgenda(deal, await loadDealTerms(deal.id, deal.kind))
    : dealCallAgenda({ stage: "to_contact" }, blankTerms());

  const { data: callId, error } = await supabase.rpc(
    "plan_deal_negotiation_call",
    {
      p_title: title,
      p_occurred_at: slot.slot.start.toISOString(),
      p_ends_at: slot.slot.end.toISOString(),
      p_deal_id: dealId,
      p_participation_id: participationId,
      p_assignee_person_id: assigneeId,
      p_meeting_url: url?.data ?? undefined,
      p_agenda: agenda,
      p_guests: guests.guests.map((g) => ({
        email: g.email,
        name: g.name,
        contact_id: g.contactId,
      })),
    },
  );
  if (error || !callId) {
    const code = error ? ERRORS[error.message] : undefined;
    if (!code)
      console.error("planNegotiationCall:", error?.code, error?.message);
    return { ok: false, error: code ?? "forbidden" };
  }

  // The deal, opened by the gesture when it planned on a participation.
  const { data: call } = await supabase
    .from("calls")
    .select("deal_id")
    .eq("id", callId)
    .maybeSingle();
  const planned = call?.deal_id
    ? (deal ?? (await loadDeal(access, call.deal_id)))
    : null;
  if (google)
    await attachMeet({
      callId,
      title,
      slot: slot.slot,
      negotiatorId: planned?.assignee?.id ?? assigneeId ?? null,
      guests,
    });
  // Giving the deal notifies its negotiator (deal_assigned).
  await schedulePendingPushes();
  if (planned) revalidatePath(routes.deal(planned.id));
  revalidatePath(routes.deals);
  return { ok: true, id: callId };
}
