import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// The invoices the person's page asks for (/c/, J10): each signed contract
// with a fee, whom to invoice, and where their invoice stands. Read by the
// person's token, without an account (get_contact_invoices).

const schema = z.array(
  z.object({
    needId: z.uuid(),
    contract: z.string(),
    amountCents: z.number(),
    billTo: z.string(),
    at: z.string(),
    invoice: z
      .object({
        number: z.string(),
        amountCents: z.number(),
        receivedOn: z.string(),
        dueOn: z.string(),
        paidOn: z.string().nullable(),
      })
      .nullable(),
  }),
);
export type ContactInvoice = z.infer<typeof schema>[number];

export async function getContactInvoices(
  token: string,
): Promise<ContactInvoice[]> {
  if (!/^[0-9a-f]{64}$/.test(token)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contact_invoices", {
    p_contact_token: token,
  });
  if (error) {
    console.error("getContactInvoices:", error.message);
    return [];
  }
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : [];
}
