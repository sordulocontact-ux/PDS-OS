import "server-only";

import { briefHtml } from "@/lib/framing/brief-pdf";
import { snapshotOf, type BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { htmlToPdf } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

// The Brief's PDF, printed once per version and state and kept in Storage
// (…20261028000701_framing_brief_pdfs): a download reads the file back
// instead of starting a browser. Everything with the user's session (RLS).
const BUCKET = "framing-brief-pdfs";

export type BriefVersionRow = {
  id: string;
  version: number;
  state: string;
  sent_at: string | null;
  content: unknown;
};

const pathOf = (brief: BriefVersionRow) => `${brief.id}-${brief.state}.pdf`;

/** A version (or the Cadrage as it stands) printed now. */
export function printBriefPdf(
  snapshot: BriefSnapshot,
  brief: BriefVersionRow | null,
): Promise<Uint8Array> {
  return htmlToPdf(
    briefHtml({
      snapshot,
      version: brief?.version ?? null,
      state: brief?.state ?? null,
    }),
  );
}

/** The PDF of a sent version, printed before; null when there is none yet. */
export async function keptBriefPdf(
  brief: BriefVersionRow,
): Promise<Uint8Array | null> {
  if (!brief.sent_at) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).download(pathOf(brief));
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

/**
 * Keeps the PDF of a sent version. Only the owner or the direction may
 * (RLS); for anyone else, or when a file is already there, nothing happens.
 */
export async function keepBriefPdf(
  brief: BriefVersionRow,
  pdf: Uint8Array,
): Promise<void> {
  if (!brief.sent_at) return;
  const supabase = await createClient();
  await supabase.storage
    .from(BUCKET)
    .upload(pathOf(brief), pdf, { contentType: "application/pdf" });
}

/**
 * Prints a version just sent (by its id) or just validated (by its
 * validation) and keeps it, after the response (`after`): the first
 * download is then as fast as the others.
 */
export async function keepSentBriefPdf(
  by: { id: string } | { validationId: string },
): Promise<void> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from("framing_briefs")
      .select("id, version, state, sent_at, content");
    const { data: brief } = await (
      "id" in by
        ? query.eq("id", by.id)
        : query.eq("validation_id", by.validationId)
    ).maybeSingle();
    const snapshot = brief ? snapshotOf(brief.content) : null;
    if (!brief || !snapshot) return;
    await keepBriefPdf(brief, await printBriefPdf(snapshot, brief));
  } catch (error) {
    console.error("[framing-brief] pdf not kept:", by, error);
  }
}
