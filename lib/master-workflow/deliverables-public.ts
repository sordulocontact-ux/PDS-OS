import "server-only";

import { z } from "zod";

import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";
import { createClient } from "@/lib/supabase/server";

// « Autres livrables » on the mastering engineer's link (docs/projet-
// complet/master.md § 8): each deliverable the Brief expects for a title
// that has its Master final, received or not (get_master_deliverables).

const schema = z.array(
  z.object({
    masterId: z.uuid(),
    title: z.string(),
    deliverable: z.string(),
    fileName: z.string().nullable().catch(null),
    at: z.string().nullable().catch(null),
    viaLink: z.boolean().nullable().catch(null),
  }),
);

export type LinkDeliverable = z.infer<typeof schema>[number];

export async function getLinkDeliverables(
  key: string,
): Promise<LinkDeliverable[]> {
  if (!LINK_KEY.test(key)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_master_deliverables", {
    ...linkKeyArgs(key),
  });
  if (error) console.error("getLinkDeliverables:", error.message);
  const parsed = schema.safeParse(data ?? []);
  return parsed.success ? parsed.data : [];
}
