import { notFound } from "next/navigation";
import { z } from "zod";

import { DealHistory } from "@/components/deals/deal-history";
import { DealInfo } from "@/components/deals/deal-info";
import { DealNextAction } from "@/components/deals/deal-next-action";
import { DealNow } from "@/components/deals/deal-now";
import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { DealStages } from "@/components/deals/deal-stages";
import { DealTerms } from "@/components/deals/deal-terms";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { dealName } from "@/lib/deals/names";
import { loadDeal, loadDealEvents } from "@/lib/deals/queries";
import { loadDealTerms } from "@/lib/deals/term-queries";
import { deals as t } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/projects/types";

/** The members who negotiate, for whoever may assign the deal. */
async function negotiatorsFor(canAssign: boolean) {
  if (!canAssign) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_deal_negotiators");
  return Object.fromEntries(
    (data ?? []).map((n) => [
      n.person_id,
      personName(n.first_name, n.last_name),
    ]),
  );
}

/**
 * A deal's page (BIZ 4): its stage beside its name, « Maintenant » when the
 * reader has a gesture, then the next action, the terms negotiated
 * (BIZ 3), the stages, what it is about and who negotiates it, and its
 * history at the bottom. Not found for whoever may not read it.
 */
export default async function DealPage({
  params,
}: PageProps<"/app/deals/[dealId]">) {
  const { dealId } = await params;
  if (!z.uuid().safeParse(dealId).success) notFound();
  const access = await requireApproved();
  const deal = await loadDeal(access, dealId);
  if (!deal) notFound();
  const [events, terms, negotiators] = await Promise.all([
    loadDealEvents(deal.id),
    loadDealTerms(deal.id, deal.kind),
    negotiatorsFor(deal.canAssign),
  ]);
  const s = t.page.sections;

  return (
    <PageContainer>
      <BackLink href={routes.deals}>{t.page.back}</BackLink>
      <PageHeader
        title={dealName(deal)}
        badge={<DealStageBadge deal={deal} size="md" />}
      />
      <DealNow deal={deal} />
      <PageSection id="prochaine-action" title={s.next}>
        <DealNextAction deal={deal} />
      </PageSection>
      <PageSection id="termes" title={t.terms.title}>
        <DealTerms dealId={deal.id} terms={terms} canWrite={deal.canWrite} />
      </PageSection>
      <PageSection id="etapes" title={s.stages}>
        <DealStages deal={deal} events={events} />
      </PageSection>
      <PageSection id="informations" title={s.info}>
        <DealInfo deal={deal} negotiators={negotiators} />
      </PageSection>
      <PageSection id="historique" title={s.history}>
        <DealHistory deal={deal} events={events} />
      </PageSection>
    </PageContainer>
  );
}
