import { BriefCard } from "@/components/finance/home/brief-card";
import { financeBrief } from "@/lib/assistant/finance-brief/generate";
import type { BriefSlot } from "@/lib/assistant/finance-brief/slots";

/**
 * The week's summary written by PO (lot 7): read from the label's cache or
 * worded now. Rendered inside a Suspense whose fallback is the same card
 * with the code's sentence, so the page never waits for the model.
 */
export async function FinanceBriefCard({
  organizationId,
  today,
  slots,
}: {
  organizationId: string;
  today: string;
  slots: BriefSlot[];
}) {
  const brief = await financeBrief({ organizationId, today, slots });
  return <BriefCard brief={brief} slots={slots} />;
}
