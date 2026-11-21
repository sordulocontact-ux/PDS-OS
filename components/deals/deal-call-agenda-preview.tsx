import { PageSection } from "@/components/shell/page-section";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";

const fr = { dealCalls };

/**
 * The agenda a deal's call will have, as the code writes it (dealCallTopics),
 * in the call's dialog: last and folded, a chevron opens it (Sacha
 * 20/11/2026: « prend trop de place »). The same in every « Caler le call »
 * (DealCallButton, NegotiationCallButton).
 */
export function DealCallAgendaPreview({
  id,
  topics,
}: {
  id: string;
  topics: string[];
}) {
  const t = fr.dealCalls.prepare;
  return (
    <PageSection
      id={id}
      title={t.agendaTitle}
      description={topics.length === 1 ? t.nothingToNegotiate : undefined}
      collapsible
      defaultOpen={false}
    >
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-[color:var(--text-secondary)]">
        {topics.map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
      </ul>
    </PageSection>
  );
}
