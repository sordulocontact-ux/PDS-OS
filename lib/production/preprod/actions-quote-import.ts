"use server";

import { z } from "zod";

import { PRODUCTION_QUOTE_INSTRUCTIONS } from "@/lib/ai/instructions/production-quote";
import { extract, extractFromImage } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { productionQuoteSchema } from "@/lib/ai/schemas/production-quote";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { sourceText } from "@/lib/legal/contracts/source-text";
import { PRODUCTION_FILE_BUCKET } from "@/lib/production/files/rules";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { verifyQuote, type QuoteProposals } from "./quote-verify";
import { EQUIPMENT_CATEGORIES } from "./types";
import {
  forbidden,
  invalid,
  nextPosition,
  preprodFailure,
  sheetOrg,
} from "./result";

// « Lire le devis avec PO » (PROD-014): PO reads a quote already dropped in
// « Devis et captures » (a PDF read as text, an image read as such) and
// proposes its lines; the code keeps what it finds in the quote
// (verifyQuote); nothing is written before « Ajouter au matériel ».

const e = fr.productionPreprod.quoteImport.errors;
const MAX_TEXT = 40_000;
// The images the model reads.
const READABLE_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const proposeSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  fileId: z.uuid(),
});

export async function proposeQuoteImport(
  input: z.input<typeof proposeSchema>,
): Promise<
  { ok: true; proposals: QuoteProposals } | { ok: false; error: string }
> {
  await requireApproved();
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { projectId, sheetId, fileId } = parsed.data;
  const supabase = await createClient();
  const [fileRes, allowed, existingRes] = await Promise.all([
    supabase
      .from("production_files")
      .select("path, file_name, mime")
      .eq("id", fileId)
      .eq("sheet_id", sheetId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.rpc("production_can_organize", { p_project_id: projectId }),
    supabase
      .from("production_equipment")
      .select("id, category, label")
      .eq("sheet_id", sheetId),
  ]);
  if (!fileRes.data) return { ok: false, error: e.notFound };
  if (allowed.data !== true) return { ok: false, error: e.forbidden };
  const file = fileRes.data;
  const { data: blob, error: downloadError } = await supabase.storage
    .from(PRODUCTION_FILE_BUCKET)
    .download(file.path);
  if (downloadError || !blob) return { ok: false, error: e.unreadable };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const name = file.file_name.toLowerCase();
  const isImage = READABLE_IMAGES.includes(file.mime);
  const isPdf = file.mime === "application/pdf" || name.endsWith(".pdf");
  const isText = file.mime.startsWith("text/") || /\.(txt|csv)$/.test(name);
  // Anything else (Word, Excel, HEIC…) would reach the model as noise.
  if (!isImage && !isPdf && !isText) return { ok: false, error: e.unsupported };

  let text: string | null = null;
  try {
    if (!isImage) {
      text = await sourceText(Buffer.from(bytes), isPdf ? "pdf" : "txt");
      if (!text) return { ok: false, error: e.unreadable };
      text = text.slice(0, MAX_TEXT);
    }
    const { output } = isImage
      ? await extractFromImage(
          productionQuoteSchema,
          { data: bytes, mediaType: file.mime },
          PRODUCTION_QUOTE_INSTRUCTIONS,
        )
      : await extract(
          productionQuoteSchema,
          text!,
          PRODUCTION_QUOTE_INSTRUCTIONS,
        );
    return {
      ok: true,
      proposals: verifyQuote(output, text, existingRes.data ?? []),
    };
  } catch (error) {
    console.error("proposeQuoteImport:", error);
    return { ok: false, error: aiQuotaMessage(error) ?? e.provider };
  }
}

const applySchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  fileId: z.uuid(),
  supplierName: z.string().trim().max(200),
  depositCents: z.number().int().min(0).max(100_000_000).nullable(),
  conditions: z.string().trim().max(1000),
  lines: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        category: z.enum(EQUIPMENT_CATEGORIES),
        quantity: z.number().int().min(1).max(1000).nullable(),
        priceCents: z.number().int().min(0).max(100_000_000).nullable(),
        existingId: z.uuid().nullable(),
      }),
    )
    .min(1)
    .max(200),
});

/** « Ajouter au matériel »: the lines kept, as checked by the person — a
 * new line « À vérifier », an existing one updated (never doubled); the
 * deposit and conditions go with the quote's lines. */
export async function applyQuoteImport(
  input: z.input<typeof applySchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const common = {
    supplier_name: p.supplierName || null,
    return_terms: p.conditions || null,
    quote_file_id: p.fileId,
    status: "to_verify",
  };
  let position = await nextPosition(
    supabase,
    "production_equipment",
    p.sheetId,
  );
  let depositPlaced = false;
  for (const line of p.lines) {
    const deposit = depositPlaced ? null : p.depositCents;
    depositPlaced = depositPlaced || p.depositCents !== null;
    const fields = {
      ...common,
      label: line.label,
      category: line.category,
      quantity: line.quantity,
      price_cents: line.priceCents,
      ...(deposit !== null ? { deposit_cents: deposit } : {}),
    };
    const { error } = line.existingId
      ? await supabase
          .from("production_equipment")
          .update(fields)
          .eq("id", line.existingId)
          .eq("sheet_id", p.sheetId)
      : await supabase.from("production_equipment").insert({
          ...fields,
          organization_id: org,
          project_id: p.projectId,
          sheet_id: p.sheetId,
          position: position++,
        });
    if (error) return preprodFailure(error);
  }
  return prepDone(p.projectId);
}
