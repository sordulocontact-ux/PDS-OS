import { DealCalls } from "@/components/deals/deal-calls";
import { DealContacts } from "@/components/deals/deal-contacts";
import { DealHistory } from "@/components/deals/deal-history";
import { DealInfo } from "@/components/deals/deal-info";
import { DealMemoSections } from "@/components/deals/deal-memo-sections";
import { DealStages } from "@/components/deals/deal-stages";
import { DealTerms } from "@/components/deals/deal-terms";
import { PageSection } from "@/components/shell/page-section";
import type { Access } from "@/lib/auth/access";
import type { DealCall } from "@/lib/deals/call-queries";
import type { DealContact } from "@/lib/deals/contact-queries";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal, DealEvent } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals as t } from "@/lib/i18n/fr/deals";

/**
 * « Dossier » of a deal, to read (Ibé 18/11/2026: « tu ne sais pas si tu
 * dois remplir ce qu'il y a en bas »): what it is about and who negotiates
 * it (« Changer » stays for whoever assigns), its terms, people, calls,
 * deal memo and contract, stages and history — without the gestures, which
 * are in « À faire » (DealTodoView).
 */
export function DealFileView({
  access,
  deal,
  terms,
  negotiators,
  contacts,
  calls,
  events,
}: {
  access: Access;
  deal: Deal;
  terms: DealTerm[];
  negotiators: Record<string, string> | null;
  contacts: DealContact[];
  calls: DealCall[];
  events: DealEvent[];
}) {
  const s = t.page.sections;
  return (
    <>
      <PageSection id="informations" title={s.info}>
        <DealInfo deal={deal} negotiators={negotiators} />
      </PageSection>
      <PageSection id="termes" title={t.terms.title}>
        <DealTerms dealId={deal.id} terms={terms} canWrite={false} />
      </PageSection>
      <PageSection id="contacts" title={dealContacts.section}>
        <DealContacts dealId={deal.id} contacts={contacts} canWrite={false} />
      </PageSection>
      <PageSection id="calls" title={dealCalls.section}>
        <DealCalls calls={calls} />
      </PageSection>
      <DealMemoSections access={access} deal={deal} terms={terms} readOnly />
      <PageSection id="etapes" title={s.stages}>
        <DealStages deal={deal} events={events} />
      </PageSection>
      <PageSection id="historique" title={s.history}>
        <DealHistory deal={deal} events={events} />
      </PageSection>
    </>
  );
}
