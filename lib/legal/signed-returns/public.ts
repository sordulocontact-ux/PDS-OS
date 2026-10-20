import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// What the person's page (/c/) asks them to sign (20261020070101): their
// contracts of the Juridique in this project, and their line of the SACEM
// bulletin being signed. Read by their token, without an account
// (get_contact_signatures): never another person's.

const text = z.string().nullable().catch(null);

const schema = z.object({
  contracts: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        status: z.enum([
          "draft",
          "in_review",
          "approved",
          "sent",
          "signed",
          "terminated",
        ]),
        version: z.number().nullable().catch(null),
        sentVia: z.enum(["link", "other"]).nullable().catch(null),
        sentHow: text,
        sentOn: text,
        signedOn: text,
        deposit: z
          .object({ fileName: z.string(), at: z.string() })
          .nullable()
          .catch(null),
        at: z.string(),
      }),
    )
    .catch([]),
  bulletins: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        version: z.number(),
        status: z.enum(["pending", "signed"]),
        via: z.enum(["link", "other"]).nullable().catch(null),
        signedAt: text,
        signedOn: text,
        at: z.string(),
      }),
    )
    .catch([]),
});
export type ContactSignatures = z.infer<typeof schema>;
export type ContactContract = ContactSignatures["contracts"][number];
export type ContactBulletin = ContactSignatures["bulletins"][number];

const EMPTY: ContactSignatures = { contracts: [], bulletins: [] };

export const getContactSignatures = cache(
  async (token: string): Promise<ContactSignatures> => {
    if (!/^[0-9a-f]{64}$/.test(token)) return EMPTY;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_contact_signatures", {
      p_contact_token: token,
    });
    if (error) {
      console.error("getContactSignatures:", error.message);
      return EMPTY;
    }
    const parsed = schema.safeParse(data);
    return parsed.success ? parsed.data : EMPTY;
  },
);
