import "server-only";

import { dealMemoAddress } from "@/lib/email/deal-memo-address";
import { inboxEnabled } from "@/lib/email/inbox";
import { emailEnabled } from "@/lib/email/send";
import {
  contactAddressOf,
  withPrivateDetails,
} from "@/lib/network/private-details";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The deal memo's circuit by e-mail (réunion avec Ibé du 18/11/2026), read
// with the user's session: the people in the loop, PO's address of the deal,
// and what the memo sent back starts from.

/** Someone in the loop of a deal's memo: a contact of the Réseau (in copy
 * of the memo sent back) or a member who reads the deal (told of each step). */
export type LoopEntry = {
  id: string;
  kind: "contact" | "member";
  // The contact or the member.
  refId: string;
  name: string;
  // A contact's address, when the reader may read it.
  email: string | null;
};

export async function loadDealLoop(dealId: string): Promise<LoopEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_memo_loop")
    .select(
      "id, contact_id, person_id, member:people!deal_memo_loop_person_id_fkey(first_name, last_name)",
    )
    .eq("deal_id", dealId)
    .order("created_at");
  if (error) console.error("loadDealLoop:", error.message);
  const rows = data ?? [];
  const contactIds = rows.flatMap((r) => r.contact_id ?? []);
  const { data: contacts } = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, name, email, private_owner_person_id")
        .in("id", contactIds)
    : { data: [] };
  const { rows: readable } = await withPrivateDetails(supabase, contacts ?? []);
  const contactOf = new Map(readable.map((c) => [c.id, c]));
  return rows.flatMap((r): LoopEntry[] => {
    if (r.contact_id) {
      const c = contactOf.get(r.contact_id);
      return c
        ? [
            {
              id: r.id,
              kind: "contact",
              refId: c.id,
              name: c.name,
              email: c.email ?? null,
            },
          ]
        : [];
    }
    return r.person_id && r.member
      ? [
          {
            id: r.id,
            kind: "member",
            refId: r.person_id,
            name: personName(r.member.first_name, r.member.last_name),
            email: null,
          },
        ]
      : [];
  });
}

/** The members who may be put in the loop (they read the deal), for
 * whoever writes it: id → name. */
export async function loadLoopMemberOptions(
  dealId: string,
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_deal_loop_members", {
    p_deal_id: dealId,
  });
  if (error) console.error("list_deal_loop_members:", error.message);
  return Object.fromEntries((data ?? []).map((m) => [m.person_id, m.name]));
}

/** What the page says of the e-mail: PO's address of the deal (where the
 * memo is sent or forwarded), and whether PDS OS sends e-mails. */
export function dealMailSetup(dealId: string): {
  address: string | null;
  canEmail: boolean;
} {
  return {
    address: inboxEnabled() ? dealMemoAddress(dealId) : null,
    canEmail: emailEnabled(),
  };
}

/** To whom the validated memo goes back by default: the address that sent
 * the latest memo received, else the counterpart's address in the Réseau
 * (read only by whoever may), else nobody known. */
export async function memoReplyTo(
  latestFrom: string | null,
  counterpartId: string | null,
): Promise<{
  name: string;
  email: string;
  source: "email" | "network";
} | null> {
  if (latestFrom)
    return { name: latestFrom, email: latestFrom, source: "email" };
  if (!counterpartId) return null;
  const contact = await contactAddressOf(await createClient(), counterpartId);
  return contact?.email
    ? { name: contact.name, email: contact.email, source: "network" }
    : null;
}
