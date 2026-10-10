"use server";

import { z } from "zod";

import { legalClearanceInstructions } from "@/lib/ai/instructions/legal-clearance";
import { extract } from "@/lib/ai/llm";
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
    return { ok: false, error: t.providerError };
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
  return {
    ok: true,
    proposal: {
      event: output.event,
      outgoing: output.outgoing,
      status: statusFromEvent(
        output.event,
        clearance.status as ClearanceStatus,
      ),
      holders,
      terms,
    },
  };
}
