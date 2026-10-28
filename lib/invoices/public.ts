import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// « Votre facture » on a person's private link (/m: the engineer's Master
// link, /c: their page by project), read by get_person_invoices: whom to
// invoice, their RIB (masked, never in full) and each of their invoices on
// the project, never another person's.

const TOKEN = /^[0-9a-f]{64}$/;
const text = z.string().nullable().catch(null);
const cents = z.number().nullable().catch(null);
const part = z
  .number()
  .nullish()
  .transform((v) => v ?? null);

const schema = z.object({
  billTo: z
    .object({ legalName: z.string(), address: text, siret: text, vat: text })
    .nullable()
    .catch(null),
  rib: z
    .object({ masked: z.string(), holder: z.string() })
    .nullable()
    .catch(null),
  ribPending: z.boolean().catch(false),
  invoices: z.array(
    z.object({
      id: z.uuid(),
      origin: z.enum(["master", "contract"]),
      contract: text,
      state: z.enum(["requested", "received", "paid"]),
      requestedAt: z.string(),
      expected: z
        .object({ total: z.number(), mix: part, mastering: part })
        .nullable()
        .catch(null),
      number: text,
      amountCents: cents,
      receivedAt: text,
      dueOn: text,
      paidOn: text,
    }),
  ),
});

export type PersonInvoices = z.infer<typeof schema>;
export type PersonInvoice = PersonInvoices["invoices"][number];

export const getPersonInvoices = trackedCache(
  async (token: string): Promise<PersonInvoices | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_person_invoices", {
      p_token: token,
    });
    if (error) {
      console.error("getPersonInvoices:", error.message);
      return null;
    }
    if (!data) return null;
    const parsed = schema.safeParse(data);
    if (!parsed.success) console.error("getPersonInvoices: unreadable");
    return parsed.success ? parsed.data : null;
  },
);
