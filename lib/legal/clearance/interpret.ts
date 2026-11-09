"use server";

import { z } from "zod";

import { legalClearanceInstructions } from "@/lib/ai/instructions/legal-clearance";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { clearanceMessageSchema } from "@/lib/ai/schemas/legal-clearance";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { parseSaidEuros, verbatimFrom } from "@/lib/assistant/verbatim";
import { fr } from "@/lib/i18n/fr";
import {
  statusFromEvent,
  type ClearanceStatus,
  type HolderRole,
} from "@/lib/legal/clearance/matrix";
import { createClient } from "@/lib/supabase/server";

// « Justine peut écrire librement ce qui s'est passé ; PO propose la mise à
// jour et l'action autorisée » (ticket Juridique 05): the model reads the
// message, the code keeps what is written in it and picks the state to
// propose (the action matrix); nothing is written here.

export type MessageProposal = {
  event: string;
  outgoing: boolean;
  status: ClearanceStatus | null;
  holders: Array<{
    name: string;
    role: HolderRole;
    right: "work" | "master";
  }>;
  // One line per right (the work, the recording), or one without right.
  terms: Array<{
    right: "work" | "master" | null;
    amountCents: number | null;
    share: string | null;
    credits: string | null;
    territory: string | null;
    duration: string | null;
  }>;
};

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function readClearanceMessage(
  projectId: string,
  clearanceId: string,
  message: string,
  // A reply received by e-mail, read as received: its reading is kept with
  // it, and given back without a new call (Sacha, 09/11/2026).
  receivedId?: string,
): Promise<
  { ok: true; proposal: MessageProposal } | { ok: false; error: string }
> {
  const t = fr.legalClearance.exchanges;
  const input = z
    .object({
      projectId: catalogIdSchema,
      clearanceId: catalogIdSchema,
      message: z.string().trim().min(1).max(8000),
    })
    .safeParse({ projectId, clearanceId, message });
  const access = await requireApproved();
  if (!input.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  const { data: clearance } = await supabase
    .from("legal_clearances")
    .select("work, author, element, status")
    .eq("id", input.data.clearanceId)
    .eq("project_id", input.data.projectId)
    .maybeSingle();
  if (!clearance) return { ok: false, error: fr.auth.errors.forbidden };

  const received = receivedId
    ? await receivedReply(supabase, input.data.clearanceId, receivedId)
    : null;
  const asReceived =
    received !== null && received.body.trim() === input.data.message;
  if (asReceived && received.reading)
    return { ok: true, proposal: received.reading };

  const context = `<context>\nÉlément : ${escape(clearance.element)} de « ${escape(clearance.work)} »${
    clearance.author ? ` (${escape(clearance.author)})` : ""
  }\n</context>\n<message>\n${escape(input.data.message)}\n</message>`;
  let output: z.infer<typeof clearanceMessageSchema>;
  try {
    ({ output } = await extract(
      clearanceMessageSchema,
      context,
      legalClearanceInstructions,
    ));
  } catch (error) {
    console.error("readClearanceMessage:", error);
    return { ok: false, error: aiQuotaMessage(error) ?? t.providerError };
  }

  // Only what is written in the message is kept.
  const found = verbatimFrom([input.data.message]);
  const keep = (value: string | null | undefined) =>
    value ? found.quote(value) : null;
  const holders = output.rightsholders.flatMap((h) => {
    const name = keep(h.name);
    return name ? [{ name, role: h.role, right: h.right }] : [];
  });
  const terms = output.terms
    .map((line) => {
      const amountText = keep(line.amount);
      return {
        right: line.right,
        amountCents: amountText ? parseSaidEuros(amountText) : null,
        share: keep(line.share),
        credits: keep(line.credits),
        territory: keep(line.territory),
        duration: keep(line.duration),
      };
    })
    .filter((line) =>
      [
        line.amountCents,
        line.share,
        line.credits,
        line.territory,
        line.duration,
      ].some((v) => v !== null),
    );
  const proposal: MessageProposal = {
    event: output.event,
    outgoing: output.outgoing,
    status: statusFromEvent(output.event, clearance.status as ClearanceStatus),
    holders,
    terms,
  };
  // Kept with the reply: whoever opens « Négocier » next sees it as is.
  if (asReceived) {
    const { error } = await supabase.rpc("keep_clearance_reading", {
      p_communication_id: received.id,
      p_reading: proposal,
    });
    if (error) console.error("readClearanceMessage keep:", error.message);
  }
  return { ok: true, proposal };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** A reply received of this borrowing, with the reading kept, if any. */
async function receivedReply(
  supabase: Supabase,
  clearanceId: string,
  receivedId: string,
): Promise<{
  id: string;
  body: string;
  reading: MessageProposal | null;
} | null> {
  if (!catalogIdSchema.safeParse(receivedId).success) return null;
  const { data } = await supabase
    .from("legal_clearance_communications")
    .select("id, body, reading")
    .eq("id", receivedId)
    .eq("clearance_id", clearanceId)
    .eq("direction", "in")
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    body: data.body,
    reading: (data.reading as MessageProposal | null) ?? null,
  };
}
