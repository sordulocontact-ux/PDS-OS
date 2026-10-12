import "server-only";

import {
  ENGINEER_SIGNALS,
  type EngineerMessage,
} from "@/lib/master-workflow/engineer-messages";

import { cache } from "react";
import { z } from "zod";

import { masterPackageSchema } from "@/lib/master-workflow/transmission-types";
import { createClient } from "@/lib/supabase/server";

/** The package as its public page sees it, read through
 * get_master_transmission(token): the database checks the token, its
 * expiry and its replacement by a newer sending. */

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.enum(["open", "received"]),
    package: masterPackageSchema,
    note: z.string().nullable(),
    sentAt: z.string(),
    expiresAt: z.string(),
    acknowledgedAt: z.string().nullable(),
    // The mastering added to the mix link of the same engineer.
    continued: z.boolean().default(false),
    // Every version of the engineer's stage, newest first, with what the
    // label sent and decided: one entry per version (PROJ-BUG-08).
    versions: z
      .array(
        z.object({
          masterId: z.string(),
          title: z.string(),
          number: z.number(),
          // The stage of the version: a link carried on from the mix to the
          // mastering shows both (PROJ-BUG-09).
          stage: z.enum(["mix", "mastering"]).optional(),
          fileName: z.string().nullable(),
          receivedAt: z.string(),
          summary: z.string().nullable(),
          sentAt: z.string().nullable(),
          decision: z.enum(["approved", "changes_requested"]).nullable(),
          decidedAt: z.string().nullable(),
          decidedBy: z.string().nullable(),
          decisionNote: z.string().nullable(),
        }),
      )
      .default([]),
    // What the engineer deposited through this link, newest first.
    deliveries: z
      .array(
        z.object({
          masterId: z.string(),
          fileName: z.string(),
          sentAt: z.string(),
        }),
      )
      .default([]),
  }),
  z.object({ state: z.enum(["replaced", "expired", "revoked"]) }),
]);

export type PublicPackage = z.infer<typeof publicSchema>;

export const TOKEN = /^[0-9a-f]{64}$/;

/** Null when the token is malformed or unknown. */
export const getPublicPackage = cache(
  async (token: string): Promise<PublicPackage | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_master_transmission", {
      p_token: token,
    });
    if (error) {
      console.error("getPublicPackage:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    if (!parsed.success && data)
      console.error("getPublicPackage: unreadable package");
    return parsed.success ? parsed.data : null;
  },
);

/**
 * The engineer opened their link (PROJ-UX-09): noted once by the database,
 * never read as a taking charge. A failure only loses that mark.
 */
export async function noteOpened(token: string): Promise<void> {
  if (!TOKEN.test(token)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_master_transmission_opened", {
    p_token: token,
  });
  if (error) console.error("noteOpened:", error.message);
}

/** The thread of a link (PROJ-AMEL-02), as the engineer reads it. */
export async function getEngineerThread(
  token: string,
): Promise<EngineerMessage[]> {
  if (!TOKEN.test(token)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_master_engineer_messages", {
    p_token: token,
  });
  if (error) console.error("getEngineerThread:", error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    stage: m.stage === "mastering" ? "mastering" : "mix",
    kind: ENGINEER_SIGNALS.find((k) => k === m.kind) ?? ("message" as const),
    author: m.author === "team" ? "team" : "engineer",
    body: m.body,
    delayDays: m.delay_days,
    status: m.status === "open" || m.status === "handled" ? m.status : null,
    createdAt: m.created_at,
  }));
}
