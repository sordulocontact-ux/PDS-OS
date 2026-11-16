import "server-only";

import { inboxEnabled, withInbox, type InboxEnvelope } from "@/lib/email/inbox";
import {
  FINANCE_FILE_TYPES,
  FINANCE_FILES_BUCKET,
} from "@/lib/finance/file-rules";
import { isProofsAddress } from "@/lib/finance/proof-address";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// How far back each run looks (a message filed before is known by its
// Message-ID), how many messages and files it takes at most.
const DAYS = 14;
const MAX_MESSAGES = 300;
const MAX_FILES = 10;
// The bucket finance-files' limit (20 Mo).
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * The tickets and invoices sent to po+justificatifs@ (cron /api/cron/inbox,
 * service role: no user triggers it), filed in Finance › Justificatifs: each
 * PDF or photo joined becomes a proof « to read », stamped with the member
 * who sent it. A message from an address that is not an approved member's
 * is left in po@, untouched. Nothing is read by the AI here: there is no
 * member's session to take the request from (docs/ARCHITECTURE.md § 5 bis);
 * the box reads it when a member of the Finance opens it.
 */
export async function fileEmailedProofs(): Promise<{ filed: number } | null> {
  if (!inboxEnabled()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  return withInbox(async (inbox) => {
    const envelopes = (await inbox.recent(DAYS, MAX_MESSAGES)).filter((e) =>
      e.to.some(isProofsAddress),
    );
    const known = await filedIds(
      supabase,
      envelopes.map((e) => e.messageId),
    );
    let filed = 0;
    for (const e of envelopes) {
      if (known.has(e.messageId) || !e.from) continue;
      const { data: sender } = await supabase
        .rpc("finance_proof_sender", { p_email: e.from })
        .maybeSingle();
      if (!sender) continue;
      const message = await inbox.read(e.uid);
      if (!message) continue;
      const files = [
        ...message.pdfs.map((f) => ({ ...f, type: "application/pdf" })),
        ...message.images,
      ]
        .filter((f) => f.content.byteLength <= MAX_BYTES)
        .slice(0, MAX_FILES);
      for (const [part, f] of files.entries())
        if (await fileOne(supabase, sender, e, part, f)) filed += 1;
    }
    return { filed };
  });
}

async function fileOne(
  supabase: Admin,
  sender: { person_id: string; organization_id: string },
  e: InboxEnvelope,
  part: number,
  f: { name: string; type: string; content: Uint8Array },
): Promise<boolean> {
  const ext = FINANCE_FILE_TYPES[f.type];
  if (!ext) return false;
  const path = `${sender.organization_id}/${crypto.randomUUID()}.${ext}`;
  const stored = await supabase.storage
    .from(FINANCE_FILES_BUCKET)
    .upload(path, f.content, { contentType: f.type, upsert: false });
  if (stored.error) {
    console.error("fileEmailedProofs upload:", stored.error.message);
    return false;
  }
  const { error } = await supabase.from("finance_proofs").insert({
    organization_id: sender.organization_id,
    file_path: path,
    file_name: f.name.slice(0, 200).trim() || `Justificatif.${ext}`,
    mime: f.type,
    source: "email",
    uploaded_by: sender.person_id,
    email_from: e.from,
    email_subject: e.subject.slice(0, 300) || null,
    email_message_id: e.messageId.slice(0, 300),
    email_part: part,
    received_at: (e.date ?? new Date()).toISOString(),
  });
  if (error) {
    console.error("fileEmailedProofs insert:", error.message);
    await supabase.storage.from(FINANCE_FILES_BUCKET).remove([path]);
    return false;
  }
  return true;
}

/** The Message-IDs already filed (asked in small batches). */
async function filedIds(supabase: Admin, ids: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += 40) {
    const { data } = await supabase
      .from("finance_proofs")
      .select("email_message_id")
      .in("email_message_id", ids.slice(i, i + 40));
    for (const row of data ?? [])
      if (row.email_message_id) known.add(row.email_message_id);
  }
  return known;
}
