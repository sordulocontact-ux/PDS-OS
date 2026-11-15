import { IconSparkle3 } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { SentenceCard, Strong } from "@/components/finance/home/sentence-card";
import type { FinanceBrief } from "@/lib/assistant/finance-brief/generate";
import type { BriefSlot } from "@/lib/assistant/finance-brief/slots";
import { financeHome } from "@/lib/i18n/fr/finance-home";

const t = financeHome.brief;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text with each figure of the slots in bold, however its spaces were
 * written (PO may write « 12 000 € » with plain spaces). */
function emphasized(text: string, slots: BriefSlot[]): ReactNode {
  const figures = [...new Set(slots.flatMap((s) => s.figures))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!figures.length) return text;
  const pattern = new RegExp(
    `(${figures
      .map((f) => escape(f).replace(/[\s  ]+/g, "[\\s\\u00a0\\u202f]"))
      .join("|")})`,
    "g",
  );
  return text.split(pattern).map((part, index) =>
    // Odd parts are the figures matched by the capture group.
    index % 2 === 1 ? <Strong key={index}>{part}</Strong> : part,
  );
}

/**
 * « Résumé de la semaine » (lot 7, docs/FINANCE-V2.md): PO's sentences when
 * the code checked them, else the code's own; the foot says which.
 */
export function BriefCard({
  brief,
  slots,
}: {
  brief: FinanceBrief;
  slots: BriefSlot[];
}) {
  return (
    <SentenceCard
      icon={IconSparkle3}
      title={t.title}
      foot={brief.by === "po" ? t.byPo : t.source}
    >
      {emphasized(brief.text, slots)}
    </SentenceCard>
  );
}
