import "server-only";

import { createHash } from "node:crypto";

import { FINANCE_BRIEF_INSTRUCTIONS } from "@/lib/assistant/finance-brief/instructions";
import { codeBrief, type BriefSlot } from "@/lib/assistant/finance-brief/slots";
import { checkedBrief } from "@/lib/assistant/finance-brief/verify";
import { extract } from "@/lib/ai/llm";
import { isAiQuotaExceeded } from "@/lib/ai/quota";
import { financeBriefSchema } from "@/lib/ai/schemas/finance-brief";
import { createClient } from "@/lib/supabase/server";

/** Who wrote the sentences on the card: PO (checked), or the code. */
export type FinanceBrief = { text: string; by: "po" | "code" };

// New figures during the day (a payment, a receipt) make a new summary; past
// this many in a day for the label, the code's sentence stays (the database
// refuses beyond 12, 20261115700101_finance_briefs.sql).
const MAX_PER_DAY = 6;
// The page never waits longer for PO: the code's sentence is already shown.
const WAIT_MS = 12_000;

/** The same slots give the same summary: the cache's key within a day. */
export const fingerprintOf = (slots: BriefSlot[]) =>
  createHash("sha256").update(JSON.stringify(slots)).digest("hex");

const asData = (slots: BriefSlot[]) =>
  slots.map((s) => `- ${s.sentence}`).join("\n");

/**
 * The week's summary of Finance's overview (lot 7, docs/FINANCE-V2.md):
 * PO's wording of the code's slots, read from `finance_briefs` (one per
 * label, day and set of figures, RLS read_finance) or written once and kept
 * there. Checked again on every reading. Never throws: any failure, a
 * reached quota included, gives the code's sentence.
 *
 * Quota (docs/ARCHITECTURE.md § 5 bis): the generation takes one request
 * from the member whose visit makes it (`extract` → takeAiRequest), at most
 * once a day per set of figures for the whole label; the others read it.
 */
export async function financeBrief({
  organizationId,
  today,
  slots,
}: {
  organizationId: string;
  today: string;
  slots: BriefSlot[];
}): Promise<FinanceBrief> {
  const fallback: FinanceBrief = { text: codeBrief(slots), by: "code" };
  // Nothing to say but « Rien d'urgent »: no need for PO.
  if (slots.every((s) => s.figures.length === 0)) return fallback;
  try {
    const supabase = await createClient();
    const fingerprint = fingerprintOf(slots);
    const { data: kept, error } = await supabase
      .from("finance_briefs")
      .select("text")
      .eq("organization_id", organizationId)
      .eq("day", today)
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (error) throw error;
    if (kept) {
      const text = checkedBrief(kept.text, slots);
      return text ? { text, by: "po" } : fallback;
    }

    const { count } = await supabase
      .from("finance_briefs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("day", today);
    if ((count ?? 0) >= MAX_PER_DAY) return fallback;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const text = await Promise.race([
      write(supabase, { organizationId, today, fingerprint, slots }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), WAIT_MS);
      }),
    ]).finally(() => clearTimeout(timer));
    return text ? { text, by: "po" } : fallback;
  } catch (error) {
    console.error("[finance-brief] read failed:", error);
    return fallback;
  }
}

/** PO writes, the code checks, then keeps it for the label's day. */
async function write(
  // Made during the request: the summary is still kept if it comes late.
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    organizationId,
    today,
    fingerprint,
    slots,
  }: {
    organizationId: string;
    today: string;
    fingerprint: string;
    slots: BriefSlot[];
  },
): Promise<string | null> {
  try {
    const result = await extract(
      financeBriefSchema,
      asData(slots),
      FINANCE_BRIEF_INSTRUCTIONS,
    );
    const text = checkedBrief(result.output.text, slots);
    if (!text) {
      // A figure PO did not copy: the code's sentence stays, nothing kept.
      console.warn("[finance-brief] wording refused by the check");
      return null;
    }
    const { error } = await supabase.from("finance_briefs").insert({
      organization_id: organizationId,
      day: today,
      fingerprint,
      slots,
      text,
      model: result.model,
    });
    // Written at the same moment by another visit: theirs is as good.
    if (error && error.code !== "23505")
      console.error("[finance-brief] not kept:", error.message);
    return text;
  } catch (error) {
    if (isAiQuotaExceeded(error))
      console.info("[finance-brief] quota reached: the code's sentence stays");
    else console.error("[finance-brief] wording failed:", error);
    return null;
  }
}
