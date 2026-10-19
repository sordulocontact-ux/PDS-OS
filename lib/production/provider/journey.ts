import "server-only";

import { z } from "zod";

import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

const text = z.string().nullable();
const journeySchema = z.object({
  roles: z.array(z.enum(["company", "director", "dop"])),
  organization: z.enum(["internal", "external"]).nullable(),
  deliveryOn: text,
  progress: z.record(z.string(), z.boolean()),
  direction: z.object({
    status: z.enum(["draft", "submitted", "approved", "changes"]),
    comment: text,
    stagingIntent: text,
    runOfShow: text,
    references: text,
  }),
  quotes: z.array(
    z.object({
      id: z.string(),
      number: z.number(),
      label: z.string(),
      amountCents: z.number(),
      locBudgetCents: z.number().nullable(),
      deliveryOn: text,
      status: z.enum([
        "deposited",
        "submitted",
        "approved",
        "changes",
        "rejected",
        "replaced",
      ]),
      url: text,
      note: text,
      reason: text,
      depositedAt: z.string(),
      decidedAt: text,
    }),
  ),
  quoteRevision: z.object({ reason: z.string(), at: z.string() }).nullable(),
  quoteDue: text,
  shootOn: text,
  gearCount: z.number(),
  locations: z
    .array(z.object({ name: z.string(), status: z.string() }))
    .default([]),
  actions: z.array(z.object({ title: z.string(), dueDate: text })),
  calls: z
    .array(
      z.object({
        title: z.string(),
        occurredAt: z.string(),
        format: text,
        meetingUrl: text,
        status: z.string(),
        participants: z.array(z.string().nullable()),
        agenda: z.array(z.string().nullable()),
        invitedAt: z.string(),
        invitedBy: text,
        summary: z
          .object({
            version: z.number(),
            text: z.string(),
            sentAt: z.string(),
            sentBy: text,
          })
          .nullable(),
      }),
    )
    .default([]),
  directorProposals: z
    .array(
      z.object({
        name: z.string(),
        reelUrl: z.string(),
        note: text,
        status: z.enum(["proposed", "retained", "declined"]),
        proposedAt: z.string(),
      }),
    )
    .default([]),
});
export type LinkJourney = z.infer<typeof journeySchema>;

/** The provider's part of the journey, by its link (Ibé, 14/10). */
export async function getLinkJourney(
  token: string,
): Promise<LinkJourney | null> {
  if (!TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_production_link_journey", {
    p_token: token,
  });
  if (error) console.error("getLinkJourney:", error.message);
  const parsed = journeySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
