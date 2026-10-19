import "server-only";

import { cache } from "react";
import { z } from "zod";

import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";
import { createClient } from "@/lib/supabase/server";

// « Votre facture » on the engineer's link (docs/projet-complet/master.md
// § 9), read by get_master_invoice: null until PDS OS asks for it (the
// Master final validated). The RIB comes masked, never in full.

const text = z.string().nullable().catch(null);
const cents = z.number().nullable().catch(null);

const schema = z.object({
  state: z.enum(["requested", "received", "paid"]),
  requestedAt: z.string(),
  billTo: z
    .object({
      legalName: z.string(),
      address: z.string(),
      siret: text,
      vat: text,
    })
    .nullable()
    .catch(null),
  expected: z
    .object({ total: z.number(), mix: cents, mastering: cents })
    .nullable()
    .catch(null),
  rib: z
    .object({ masked: z.string(), holder: z.string() })
    .nullable()
    .catch(null),
  ribPending: z.boolean().catch(false),
  number: text,
  amountCents: cents,
  receivedAt: text,
  paidOn: text,
});

export type PublicInvoice = z.infer<typeof schema>;

export const getPublicInvoice = cache(
  async (key: string): Promise<PublicInvoice | null> => {
    if (!LINK_KEY.test(key)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_master_invoice",
      linkKeyArgs(key),
    );
    if (error) {
      console.error("getPublicInvoice:", error.message);
      return null;
    }
    if (!data) return null;
    const parsed = schema.safeParse(data);
    if (!parsed.success) console.error("getPublicInvoice: unreadable");
    return parsed.success ? parsed.data : null;
  },
);
