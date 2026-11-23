import "server-only";

import {
  removeSignedCopy,
  uploadSignedCopy,
} from "@/lib/contracts/signed-copy-upload";
import { contractOfAddress } from "@/lib/email/contract-address";
import { inboxEnabled, withInbox } from "@/lib/email/inbox";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// How far back each run looks, how many messages at most (a copy filed
// before is known: the contract then has its « Signé »).
const DAYS = 14;
const MAX_MESSAGES = 300;

/**
 * The contracts signed and sent back by e-mail (Sacha 23/11/2026: « PDS OS
 * peut récupérer le contrat signé en réponse du mail ? »), filed in their
 * contract by the cron /api/cron/inbox (service role: no user triggers it).
 * Which contract is known from the address the reply went to, PO's address
 * of the contract (po+ctr-<id>@, the reply-to of « Envoyer »), never by
 * reading the PDF: its PDFs become the « Signé », the e-mail itself the
 * « Preuve de signature » (`receive_contract_signed_copy`). Only a contract
 * sent for signature and without a signed copy; a person still checks the
 * signature before « Signé ».
 */
export async function fileEmailedSignedContracts(): Promise<{
  filed: number;
} | null> {
  if (!inboxEnabled()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const po = getServerEnv().EMAIL_SMTP_USER?.toLowerCase();

  return withInbox(async (inbox) => {
    const envelopes = await inbox.recent(DAYS, MAX_MESSAGES);
    const tagged = envelopes.flatMap((e) => {
      const id = e.to.map(contractOfAddress).find(Boolean);
      return id && e.from && e.from !== po ? [{ e, id }] : [];
    });
    if (tagged.length === 0) return { filed: 0 };
    const ids = [...new Set(tagged.map((t) => t.id))];
    const [{ data: contracts }, { data: signed }] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, organization_id")
        .in("id", ids)
        .eq("status", "sent"),
      supabase
        .from("contract_files")
        .select("contract_id")
        .in("contract_id", ids)
        .eq("category", "signed"),
    ]);
    const done = new Set((signed ?? []).map((f) => f.contract_id));
    const open = new Map(
      (contracts ?? [])
        .filter((c) => !done.has(c.id))
        .map((c) => [c.id, c] as const),
    );
    let filed = 0;
    for (const { e, id } of tagged) {
      const contract = open.get(id);
      if (!contract) continue;
      const message = await inbox.read(e.uid);
      if (!message || message.pdfs.length === 0) continue;
      const from = e.from ?? "";
      const files = await uploadSignedCopy(
        supabase,
        contract,
        from,
        e.date,
        message,
      );
      if (!files) continue;
      const { data: kept, error } = await supabase.rpc(
        "receive_contract_signed_copy",
        { p_contract_id: id, p_from: from, p_files: files },
      );
      if (error) console.error("fileEmailedSignedContracts:", error.message);
      if (error || kept !== true) {
        await removeSignedCopy(
          supabase,
          files.map((f) => f.path),
        );
        continue;
      }
      // One signed copy per contract: a second reply waits for a person.
      open.delete(id);
      filed += 1;
    }
    return { filed };
  });
}
