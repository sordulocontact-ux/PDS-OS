import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// The call sheet as the team reads it (PROD-016), through
// get_production_call_sheet(token): the latest published version.

const TOKEN = /^[0-9a-f]{64}$/;
const text = z.string().nullable();

const contentSchema = z.object({
  project: z.string(),
  deliverable: z.string(),
  manager: text,
  shootDate: text,
  callTime: text,
  location: z.object({ name: text, address: text, access: text }),
  team: z.array(
    z.object({ name: z.string(), role: z.string(), phone: text, email: text }),
  ),
  equipment: z.array(
    z.object({
      label: z.string(),
      quantity: z.number().nullable(),
      supplier: text,
    }),
  ),
  schedule: text,
  sequences: text,
  contactsNote: text,
  instructions: text,
  emergencies: text,
  documentsNote: text,
});

const pageSchema = z.discriminatedUnion("published", [
  z.object({
    published: z.literal(true),
    number: z.number(),
    publishedAt: z.string(),
    content: contentSchema,
  }),
  z.object({ published: z.literal(false) }),
]);

export type PublicCallSheet = z.infer<typeof pageSchema>;

export async function getPublicCallSheet(
  token: string,
): Promise<PublicCallSheet | null> {
  if (!TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_production_call_sheet", {
    p_token: token,
  });
  if (error) console.error("getPublicCallSheet:", error.message);
  const parsed = pageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
