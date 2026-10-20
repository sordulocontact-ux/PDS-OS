import "server-only";

import { z } from "zod";

import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";
import { linkKeyArgs } from "@/lib/portal/link-key";

const text = z.string().nullable();
const journeySchema = z.object({
  roles: z.array(z.enum(["company", "director", "dop", "creativeExt"])),
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
  // The proposal's versions (PR-11): the director's and the external
  // validation's links only.
  directionVersions: z
    .array(
      z.object({
        id: z.string(),
        number: z.number(),
        treatmentUrl: z.string(),
        moodboardUrl: text,
        cuttingUrl: z.string(),
        note: text,
        depositedAt: z.string(),
        depositedBy: text,
        intStatus: z.enum(["pending", "approved", "changes"]),
        intComment: text,
        intAt: text,
        extStatus: z.enum(["none", "pending", "approved", "changes"]),
        extComment: text,
        extAt: text,
      }),
    )
    .default([]),
  directionRevision: z
    .object({ reason: z.string(), at: z.string() })
    .nullable()
    .default(null),
  // The edit's versions (or a light journey's), the final file and the
  // delivery: the company's and the external validation's links only.
  cut: z
    .object({
      track: z.enum(["shoot", "artwork", "derived"]),
      gate: z.object({ clip: text, done: z.boolean() }).nullable(),
      versions: z.array(
        z.object({
          id: z.string(),
          number: z.number(),
          status: z.string(),
          url: text,
          fileName: text,
          width: z.number().nullable(),
          height: z.number().nullable(),
          submittedAt: z.string(),
          intApproved: z.boolean(),
          extStatus: z.enum(["none", "pending", "approved", "changes"]),
          extNote: text,
          note: text,
        }),
      ),
      finalUrl: text,
      finalAt: text,
      approvedAt: text,
      checkedAt: text,
      deliveredAt: text,
      recipients: z.array(z.string().nullable()),
    })
    .nullable()
    .default(null),
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
  readyAt: text.default(null),
  shootState: text.default(null),
  rushesUrl: text.default(null),
  rushesAt: text.default(null),
  gearCount: z.number(),
  locations: z
    .array(z.object({ name: z.string(), status: z.string() }))
    .default([]),
  actions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueDate: text,
      origin: text,
      doneAt: text,
      review: z.boolean(),
      checklist: z.boolean(),
    }),
  ),
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
    ...linkKeyArgs(token),
  });
  if (error) console.error("getLinkJourney:", error.message);
  const parsed = journeySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
