"use server";

import { z } from "zod";

import { RECEIPT_READING_INSTRUCTIONS } from "@/lib/ai/instructions/receipt-reading";
import { extract, extractFromImage } from "@/lib/ai/llm";
import { aiQuotaMessage, isAiQuotaExceeded } from "@/lib/ai/quota";
import { receiptReadingSchema } from "@/lib/ai/schemas/receipt-reading";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  FINANCE_FILE_TYPES,
  FINANCE_FILES_BUCKET,
} from "@/lib/finance/file-rules";
import { verifyReading } from "@/lib/finance/proof-verify";
import { refresh } from "@/lib/finance/write-helpers";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { sourceText } from "@/lib/legal/contracts/source-text";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import type { WriteResult } from "@/lib/utils/write-result";

const e = financeReceipts.errors;
// What the model reads of a long PDF (a ticket is a few lines).
const MAX_TEXT = 20_000;

/**
 * Finance › Justificatifs (lot 6): a file the browser just put in
 * finance-files (lib/finance/upload-file.ts) becomes a proof « to read ».
 * Who writes Finance only (RLS); the database stamps who dropped it.
 */
export async function addProof(input: {
  path: string;
  name: string;
  mime: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const access = await requireApproved();
  const org = access.organizationId;
  const p = z
    .object({
      path: z.string().max(300),
      name: z.string().trim().min(1).max(200),
      mime: z.string().refine((m) => m in FINANCE_FILE_TYPES),
    })
    .safeParse(input);
  if (!org || !p.success || !p.data.path.startsWith(`${org}/`))
    return { ok: false, error: e.invalid };
  if (!can(access, "manage_finance")) return { ok: false, error: e.forbidden };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_proofs")
    .insert({
      organization_id: org,
      file_path: p.data.path,
      file_name: p.data.name,
      mime: p.data.mime,
    })
    .select("id")
    .single();
  if (error) {
    console.error("addProof:", error.message);
    return { ok: false, error: e.generic };
  }
  refresh();
  return { ok: true, id: data.id };
}

/**
 * Reads a proof still « to read »: the PDF's text by unpdf, then the model
 * reads it as data (never as instructions, rule 4) and copies each value;
 * the code keeps a value verified only when the copy is in the text
 * (proof-verify.ts). A photo is read as an image: nothing of it is
 * verified. The request is taken from the quota of the member who runs it
 * (lib/ai/llm.ts): who drops the file, or for an e-mailed one, the member of
 * the Finance who opens the box. A quota reached leaves it « to read ».
 */
export async function readProof(id: string): Promise<WriteResult> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  if (!can(access, "manage_finance")) return { ok: false, error: e.forbidden };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("finance_proofs")
    .select("file_path, mime, read_state")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: e.invalid };
  if (row.read_state !== "pending") return { ok: true };

  const save = async (values: TablesUpdate<"finance_proofs">) => {
    const { error } = await supabase
      .from("finance_proofs")
      .update({ read_at: new Date().toISOString(), ...values })
      .eq("id", id)
      .eq("read_state", "pending");
    if (error) console.error("readProof save:", error.message);
    refresh();
  };
  const failed = async () => {
    await save({ read_state: "failed" });
    return { ok: false as const, error: e.read };
  };

  const { data: blob } = await supabase.storage
    .from(FINANCE_FILES_BUCKET)
    .download(row.file_path);
  if (!blob) return failed();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isImage = row.mime.startsWith("image/");
  try {
    const text = isImage
      ? null
      : ((await sourceText(Buffer.from(bytes), "pdf"))?.slice(0, MAX_TEXT) ??
        null);
    // A scanned PDF has no text to check anything against: a person enters it.
    if (!isImage && !text) return failed();
    const { output } = isImage
      ? await extractFromImage(
          receiptReadingSchema,
          { data: bytes, mediaType: row.mime },
          RECEIPT_READING_INSTRUCTIONS,
        )
      : await extract(
          receiptReadingSchema,
          text!,
          RECEIPT_READING_INSTRUCTIONS,
        );
    const r = verifyReading(output, text);
    await save({
      read_state: "read",
      read_values: r.values,
      kind: r.kind,
      vendor: r.values.vendor,
      vendor_verified: r.verified.vendor,
      amount_cents: r.values.amountCents,
      amount_verified: r.verified.amount,
      vat_cents: r.values.vatCents,
      vat_verified: r.verified.vat,
      issued_on: r.values.issuedOn,
      issued_on_verified: r.verified.issuedOn,
      reference: r.values.reference,
      reference_verified: r.verified.reference,
    });
    return { ok: true };
  } catch (error) {
    if (isAiQuotaExceeded(error))
      return { ok: false, error: aiQuotaMessage(error) ?? e.read };
    console.error("readProof:", error);
    return failed();
  }
}
